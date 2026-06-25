"""Campaign execution service.

Campaigns run in background threads — one thread per campaign.  Each thread
owns its own SQLAlchemy session (sessions are not thread-safe) and writes
progress back to the DB after every city so the UI can poll.

Stop signals: a threading.Event per campaign_id lets pause/cancel requests
interrupt the loop between cities without killing the thread mid-search.
"""
import logging
import math
import threading
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.campaign import SearchCampaign
from app.schemas.campaign import CampaignCreate, CampaignRead, CampaignStats
from app.schemas.business import SearchResultLead
from app.services.imports import batch_import_leads, search_leads

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Thread management
# ──────────────────────────────────────────────────────────────────────────────

# campaign_id → stop Event; set to request pause or cancel
_stop_signals: dict[int, threading.Event] = {}
_lock = threading.Lock()

# Google Maps Places Text Search (Basic): $0.032 per request
_COST_PER_REQUEST = 0.032


def _get_or_create_stop_signal(campaign_id: int) -> threading.Event:
    with _lock:
        if campaign_id not in _stop_signals:
            _stop_signals[campaign_id] = threading.Event()
        return _stop_signals[campaign_id]


def _clear_stop_signal(campaign_id: int) -> None:
    with _lock:
        _stop_signals.pop(campaign_id, None)


def _request_stop(campaign_id: int) -> None:
    with _lock:
        evt = _stop_signals.get(campaign_id)
        if evt:
            evt.set()


# ──────────────────────────────────────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────────────────────────────────────

def create_campaign(db: Session, payload: CampaignCreate) -> SearchCampaign:
    campaign = SearchCampaign(
        name=payload.name,
        country=payload.country,
        provider=payload.provider,
        category=payload.category,
        category_group=payload.category_group,
        cities=payload.cities,
        search_type=payload.search_type,
        expand_keywords=payload.expand_keywords,
        expand_neighbors=payload.expand_neighbors,
        auto_import=payload.auto_import,
        status="Draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def list_campaigns(db: Session) -> list[SearchCampaign]:
    return list(db.scalars(
        select(SearchCampaign).order_by(SearchCampaign.created_at.desc())
    ))


def get_campaign(db: Session, campaign_id: int) -> SearchCampaign | None:
    return db.get(SearchCampaign, campaign_id)


def delete_campaign(db: Session, campaign_id: int) -> bool:
    campaign = db.get(SearchCampaign, campaign_id)
    if not campaign:
        return False
    if campaign.status == "Running":
        _request_stop(campaign_id)
    db.delete(campaign)
    db.commit()
    return True


def campaign_stats(db: Session) -> CampaignStats:
    rows = db.scalars(select(SearchCampaign)).all()
    total_cost = sum(float(r.estimated_cost or 0) for r in rows)
    return CampaignStats(
        total=len(rows),
        running=sum(1 for r in rows if r.status == "Running"),
        completed=sum(1 for r in rows if r.status == "Completed"),
        businesses_found=sum(r.deduped_results for r in rows),
        imported=sum(r.imported for r in rows),
        opportunities=sum(r.opportunities for r in rows),
        estimated_cost=round(total_cost, 4),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Duplicate detection
# ──────────────────────────────────────────────────────────────────────────────

def check_duplicate(db: Session, payload: CampaignCreate, days: int = 7) -> list[SearchCampaign]:
    """Return recently-completed campaigns that searched the same country/provider/category."""
    cutoff = datetime.now(UTC) - timedelta(days=days)
    stmt = (
        select(SearchCampaign)
        .where(
            SearchCampaign.country == payload.country,
            SearchCampaign.provider == payload.provider,
            SearchCampaign.category == payload.category,
            SearchCampaign.status == "Completed",
            SearchCampaign.completed_at >= cutoff,
        )
        .order_by(SearchCampaign.completed_at.desc())
    )
    return list(db.scalars(stmt).all())


# ──────────────────────────────────────────────────────────────────────────────
# State transitions
# ──────────────────────────────────────────────────────────────────────────────

def start_campaign(db: Session, campaign_id: int) -> SearchCampaign | None:
    campaign = db.get(SearchCampaign, campaign_id)
    if not campaign:
        return None
    if campaign.status not in ("Draft", "Paused", "Failed", "Cancelled"):
        return campaign  # already running or completed

    # Reset counts for a fresh run
    campaign.status = "Running"
    campaign.started_at = datetime.now(UTC)
    campaign.completed_at = None
    campaign.duration_seconds = None
    campaign.raw_results = 0
    campaign.deduped_results = 0
    campaign.opportunities = 0
    campaign.imported = 0
    campaign.api_requests = 0
    campaign.estimated_cost = 0
    campaign.progress_data = {"cities_done": 0, "cities_total": len(campaign.cities)}
    db.commit()

    _clear_stop_signal(campaign_id)
    thread = threading.Thread(
        target=_execute_campaign,
        args=(campaign_id,),
        daemon=True,
        name=f"campaign-{campaign_id}",
    )
    thread.start()
    db.refresh(campaign)
    return campaign


def pause_campaign(db: Session, campaign_id: int) -> SearchCampaign | None:
    campaign = db.get(SearchCampaign, campaign_id)
    if not campaign or campaign.status != "Running":
        return campaign
    # Signal the thread; it will set status=Paused once the current city finishes
    _request_stop(campaign_id)
    campaign.status = "Paused"
    db.commit()
    db.refresh(campaign)
    return campaign


def resume_campaign(db: Session, campaign_id: int) -> SearchCampaign | None:
    return start_campaign(db, campaign_id)


def cancel_campaign(db: Session, campaign_id: int) -> SearchCampaign | None:
    campaign = db.get(SearchCampaign, campaign_id)
    if not campaign:
        return None
    _request_stop(campaign_id)
    campaign.status = "Cancelled"
    campaign.completed_at = datetime.now(UTC)
    if campaign.started_at:
        campaign.duration_seconds = int(
            (campaign.completed_at - campaign.started_at).total_seconds()
        )
    db.commit()
    db.refresh(campaign)
    return campaign


# ──────────────────────────────────────────────────────────────────────────────
# Background execution
# ──────────────────────────────────────────────────────────────────────────────

def _execute_campaign(campaign_id: int) -> None:
    """Run in a background daemon thread with its own DB session."""
    stop_signal = _get_or_create_stop_signal(campaign_id)
    db = SessionLocal()
    try:
        campaign = db.get(SearchCampaign, campaign_id)
        if not campaign:
            return

        cities = list(campaign.cities)
        all_leads: list[SearchResultLead] = []
        total_raw = 0
        total_api_requests = 0

        for i, city in enumerate(cities):
            # Check for stop signal between cities
            if stop_signal.is_set():
                logger.info("Campaign %d: stop signal received after city %d/%d", campaign_id, i, len(cities))
                # Status was already set to Paused/Cancelled by the caller
                _persist_progress(db, campaign, i, len(cities), all_leads, total_raw, total_api_requests)
                return

            # Update progress before searching this city
            campaign.progress_data = {
                "current_city": city,
                "cities_done": i,
                "cities_total": len(cities),
                "results_so_far": len(all_leads),
                "api_requests_so_far": total_api_requests,
            }
            db.commit()

            try:
                result = search_leads(
                    source=campaign.provider,
                    keyword=campaign.category,
                    location=f"{city}, {campaign.country}",
                    country=campaign.country,
                    expand_neighbors=campaign.expand_neighbors,
                    use_keyword_expansion=campaign.expand_keywords,
                )
            except Exception as exc:
                logger.warning("Campaign %d: error on city %r: %s", campaign_id, city, exc)
                continue

            all_leads.extend(result.leads)
            total_raw += result.analytics.raw_count

            # Estimate API requests: keywords × locations × pagination pages
            kw_count = len(result.analytics.keywords_used)
            loc_count = max(1, len(result.analytics.cities_searched))
            raw_for_call = result.analytics.raw_count
            pages = max(1, math.ceil(raw_for_call / 20)) if raw_for_call > 0 else 1
            # Each (keyword × location) is one logical request; pages account for pagination
            requests_this_call = kw_count * loc_count * pages
            total_api_requests += requests_this_call

            # Update running totals in DB (visible to polling frontend)
            deduped_so_far = _deduplicate_leads(all_leads)
            opps_so_far = _count_opportunities(deduped_so_far)
            campaign.raw_results = total_raw
            campaign.deduped_results = len(deduped_so_far)
            campaign.opportunities = opps_so_far
            campaign.api_requests = total_api_requests
            campaign.estimated_cost = round(total_api_requests * _COST_PER_REQUEST, 6)
            campaign.progress_data = {
                "current_city": city,
                "cities_done": i + 1,
                "cities_total": len(cities),
                "results_so_far": len(deduped_so_far),
                "api_requests_so_far": total_api_requests,
            }
            db.commit()

        # ── Final pass ──────────────────────────────────────────────────────
        final_leads = _deduplicate_leads(all_leads)
        opportunities = _count_opportunities(final_leads)
        imported = 0

        if campaign.auto_import and final_leads:
            opp_leads = [
                l for l in final_leads
                if l.website_status.value in ("NO_WEBSITE", "FACEBOOK_ONLY", "FREE_BUILDER")
            ]
            if opp_leads:
                try:
                    imp_result = batch_import_leads(db, opp_leads)
                    imported = imp_result.imported + imp_result.updated
                except Exception as exc:
                    logger.error("Campaign %d: auto-import failed: %s", campaign_id, exc)

        completed_at = datetime.now(UTC)
        duration = int((completed_at - campaign.started_at).total_seconds()) if campaign.started_at else 0

        campaign.status = "Completed"
        campaign.completed_at = completed_at
        campaign.duration_seconds = duration
        campaign.raw_results = total_raw
        campaign.deduped_results = len(final_leads)
        campaign.opportunities = opportunities
        campaign.imported = imported
        campaign.api_requests = total_api_requests
        campaign.estimated_cost = round(total_api_requests * _COST_PER_REQUEST, 6)
        campaign.progress_data = None
        db.commit()
        logger.info(
            "Campaign %d completed: %d raw → %d deduped | %d opps | %d imported | %d api_reqs | $%.4f",
            campaign_id, total_raw, len(final_leads), opportunities, imported,
            total_api_requests, float(campaign.estimated_cost),
        )

    except Exception as exc:
        logger.exception("Campaign %d failed with unhandled exception: %s", campaign_id, exc)
        try:
            campaign = db.get(SearchCampaign, campaign_id)
            if campaign:
                campaign.status = "Failed"
                campaign.completed_at = datetime.now(UTC)
                campaign.progress_data = {"error": str(exc)}
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
        _clear_stop_signal(campaign_id)


def _persist_progress(
    db: Session,
    campaign: SearchCampaign,
    cities_done: int,
    cities_total: int,
    all_leads: list[SearchResultLead],
    total_raw: int,
    total_api_requests: int,
) -> None:
    deduped = _deduplicate_leads(all_leads)
    campaign.raw_results = total_raw
    campaign.deduped_results = len(deduped)
    campaign.opportunities = _count_opportunities(deduped)
    campaign.api_requests = total_api_requests
    campaign.estimated_cost = round(total_api_requests * _COST_PER_REQUEST, 6)
    campaign.progress_data = {
        "cities_done": cities_done,
        "cities_total": cities_total,
        "results_so_far": len(deduped),
    }
    db.commit()


def _deduplicate_leads(leads: list[SearchResultLead]) -> list[SearchResultLead]:
    """Cross-city deduplication mirroring the logic in imports.py."""
    seen_keys: set[tuple[str, str]] = set()
    seen_websites: set[str] = set()
    out: list[SearchResultLead] = []
    for lead in leads:
        # Phone or name key
        norm_phone = _norm_phone(lead.phone)
        key: tuple[str, str] = ("phone", norm_phone) if norm_phone else ("name", lead.name.casefold())
        if key in seen_keys:
            continue
        # Website key
        norm_site = _norm_url(lead.website)
        if norm_site and norm_site in seen_websites:
            continue
        seen_keys.add(key)
        if norm_site:
            seen_websites.add(norm_site)
        out.append(lead)
    return out


def _count_opportunities(leads: list[SearchResultLead]) -> int:
    return sum(
        1 for l in leads
        if l.website_status.value in ("NO_WEBSITE", "FACEBOOK_ONLY", "FREE_BUILDER")
    )


def _norm_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return "".join(c for c in phone if c.isdigit() or c == "+")


def _norm_url(url: str | None) -> str:
    if not url:
        return ""
    s = url.lower().strip()
    for prefix in ("https://", "http://"):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    if s.startswith("www."):
        s = s[4:]
    return s.rstrip("/")
