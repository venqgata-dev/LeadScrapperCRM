"""AI Sales Intelligence Engine.

Generates sales scores, pain points, strengths, pitch, and recommendations
entirely from data already stored in the database. No HTTP requests made.
"""
from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.sales_insight import SalesInsight

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Project value rules engine
# ---------------------------------------------------------------------------

# (keywords in category, (min_gbp, max_gbp))
_VALUE_RULES: list[tuple[list[str], tuple[int, int]]] = [
    (["law", "solicitor", "barrister", "legal", "attorney"],           (3000, 7000)),
    (["dental", "dentist", "orthodontist"],                             (2500, 5000)),
    (["doctor", "medical", "clinic", "hospital", "pharmacy", "optician"], (2000, 4000)),
    (["accountant", "accounting", "financial advisor", "mortgage"],     (1500, 3500)),
    (["estate agent", "property management", "letting"],                (1500, 3000)),
    (["hotel", "bed and breakfast", "b&b", "guest house", "spa"],      (2000, 4000)),
    (["restaurant", "bistro", "brasserie", "dining"],                   (1200, 2500)),
    (["gym", "fitness", "personal trainer", "yoga", "pilates"],         (1200, 2500)),
    (["cafe", "coffee", "bakery", "deli"],                              (900, 2000)),
    (["wedding", "events", "photography", "videograph"],                (1000, 2500)),
    (["electrician", "plumber", "heating", "gas engineer", "boiler"],  (900, 1500)),
    (["builder", "construction", "roofing", "plastering", "carpentry"], (900, 1500)),
    (["cleaning", "cleaner", "domestic", "janitorial"],                 (600, 1200)),
    (["takeaway", "fast food", "kebab", "pizza", "chinese", "indian"], (800, 1800)),
    (["salon", "beauty", "hairdress", "barber", "nail"],               (800, 1500)),
    (["car", "garage", "mechanic", "mot", "bodywork", "valeting"],     (900, 1800)),
    (["florist", "flower"],                                             (700, 1400)),
    (["nursery", "childcare", "school", "tutor"],                       (1000, 2000)),
    (["funeral", "undertaker"],                                         (1200, 2500)),
]

_DEFAULT_VALUE = (500, 900)


def _project_value_range(category: str | None) -> tuple[int, int]:
    if not category:
        return _DEFAULT_VALUE
    cat_lower = category.lower()
    for keywords, value_range in _VALUE_RULES:
        if any(kw in cat_lower for kw in keywords):
            return value_range
    return _DEFAULT_VALUE


# ---------------------------------------------------------------------------
# Score calculators
# ---------------------------------------------------------------------------

def _clamp(v: int) -> int:
    return max(0, min(100, v))


def calculate_scores(b: Business) -> dict[str, int]:
    """Calculate all component scores from existing business data."""

    # ── Opportunity score (pain / need for our services) ────────────────────
    opp = 0
    ws = b.website_status
    if ws == "NO_WEBSITE":
        opp += 50
    elif ws == "FACEBOOK_ONLY":
        opp += 40
    elif ws == "FREE_BUILDER":
        opp += 25
    if b.website_https is False:
        opp += 15
    if b.website_mobile_friendly is False:
        opp += 10
    if b.website_redesign_score and b.website_redesign_score >= 60:
        opp += 15
    if b.website_has_contact_form is False:
        opp += 5
    if not b.facebook_url and not b.instagram_url:
        opp += 5
    opportunity_score = _clamp(opp)

    # ── Website quality score ───────────────────────────────────────────────
    if not b.website or ws in ("NO_WEBSITE", "FACEBOOK_ONLY"):
        website_score = 0
    elif b.website_health_score is not None:
        website_score = b.website_health_score
    else:
        # Estimate from available flags
        ws_pts = 0
        if b.website_https: ws_pts += 30
        if b.website_mobile_friendly: ws_pts += 30
        if b.website_has_favicon: ws_pts += 15
        if b.website_title: ws_pts += 15
        if b.website_description: ws_pts += 10
        website_score = _clamp(ws_pts)

    # ── SEO score ──────────────────────────────────────────────────────────
    if b.website_seo_score is not None:
        seo_score = b.website_seo_score
    else:
        seo_pts = 0
        if b.website_title: seo_pts += 25
        if b.website_description: seo_pts += 25
        if b.website_https: seo_pts += 25
        if b.website_mobile_friendly: seo_pts += 25
        seo_score = _clamp(seo_pts)

    # ── Trust score (business credibility) ─────────────────────────────────
    trust = 0
    rc = b.review_count or 0
    if rc > 100: trust += 35
    elif rc > 50: trust += 25
    elif rc > 20: trust += 15
    elif rc > 5: trust += 8
    if b.rating is not None:
        r = float(b.rating)
        if r >= 4.8: trust += 30
        elif r >= 4.5: trust += 22
        elif r >= 4.0: trust += 15
        elif r >= 3.5: trust += 8
    if b.phone: trust += 15
    if b.email: trust += 15
    if b.address: trust += 5
    trust_score = _clamp(trust)

    # ── Contact score (how reachable are they) ──────────────────────────────
    contact = 0
    if b.phone: contact += 40
    if b.email: contact += 35
    if b.website: contact += 15
    if b.address: contact += 10
    contact_score = _clamp(contact)

    # ── Social score ────────────────────────────────────────────────────────
    social = 0
    if b.facebook_url: social += 40
    if b.instagram_url: social += 35
    if b.linkedin_url: social += 25
    social_score = _clamp(social)

    # ── Overall score for sales priority ───────────────────────────────────
    # Weights: opportunity 40%, contact 30%, trust 20%, social 10%
    overall = (
        opportunity_score * 0.40
        + contact_score    * 0.30
        + trust_score      * 0.20
        + social_score     * 0.10
    )
    overall_score = _clamp(int(round(overall)))

    return {
        "opportunity_score": opportunity_score,
        "website_score":     website_score,
        "seo_score":         seo_score,
        "trust_score":       trust_score,
        "contact_score":     contact_score,
        "social_score":      social_score,
        "overall_score":     overall_score,
    }


# ---------------------------------------------------------------------------
# Pain points + strengths
# ---------------------------------------------------------------------------

def identify_pain_points(b: Business) -> list[str]:
    points: list[str] = []
    ws = b.website_status
    if ws == "NO_WEBSITE":
        points.append("No website — completely invisible online")
    elif ws == "FACEBOOK_ONLY":
        points.append("Facebook-only presence — no professional website")
    elif ws == "FREE_BUILDER":
        points.append("Free website builder — lacks credibility and SEO")
    if ws == "HAS_WEBSITE":
        if b.website_redesign_score and b.website_redesign_score >= 60:
            points.append("Old or poor-quality website — redesign opportunity")
        elif b.website_health_score and b.website_health_score < 40:
            points.append("Poor website health score")
    if b.website_https is False:
        points.append("No SSL — site shows as 'Not Secure' to visitors")
    if b.website_mobile_friendly is False:
        points.append("Not mobile-friendly — losing mobile traffic")
    if b.website_has_contact_form is False and b.website:
        points.append("No contact form detected")
    if b.website_has_meta_description is False and b.website:
        points.append("Missing meta description — hurts search visibility")
    if not b.facebook_url and not b.instagram_url and not b.linkedin_url:
        points.append("No social media presence detected")
    elif not b.facebook_url:
        points.append("Missing Facebook page")
    if not b.instagram_url:
        points.append("Missing Instagram profile")
    if not b.linkedin_url:
        points.append("Missing LinkedIn profile")
    if b.website_load_time_ms and b.website_load_time_ms > 5000:
        points.append(f"Slow website ({b.website_load_time_ms // 1000}s load time)")
    rc = b.review_count or 0
    if rc == 0:
        points.append("No reviews — no social proof")
    elif rc < 10:
        points.append(f"Very few reviews ({rc}) — low social proof")
    if not b.email:
        points.append("No email address on record")
    if b.website_cms and b.website_cms in ("Wix", "Weebly", "GoDaddy Website Builder"):
        points.append(f"Uses {b.website_cms} — limited SEO and customisation")
    return points


def identify_strengths(b: Business) -> list[str]:
    strengths: list[str] = []
    rc = b.review_count or 0
    if rc > 100:
        strengths.append(f"Excellent review volume ({rc} reviews)")
    elif rc > 50:
        strengths.append(f"Strong review count ({rc} reviews)")
    elif rc > 20:
        strengths.append(f"Good review count ({rc} reviews)")
    if b.rating is not None and float(b.rating) >= 4.8:
        strengths.append(f"Exceptional rating ({b.rating}★)")
    elif b.rating is not None and float(b.rating) >= 4.5:
        strengths.append(f"Excellent rating ({b.rating}★)")
    elif b.rating is not None and float(b.rating) >= 4.0:
        strengths.append(f"Good rating ({b.rating}★)")
    if b.website and b.website_health_score and b.website_health_score >= 70:
        strengths.append("Good website health score")
    if b.website_https:
        strengths.append("Website uses HTTPS")
    if b.website_mobile_friendly:
        strengths.append("Mobile-friendly website")
    if b.website_load_time_ms and b.website_load_time_ms < 2000:
        strengths.append("Fast website load time")
    if b.website_seo_score and b.website_seo_score >= 70:
        strengths.append("Strong SEO foundations")
    if b.email and b.phone:
        strengths.append("Verified contact information (phone + email)")
    elif b.phone:
        strengths.append("Phone number on record")
    if b.facebook_url and b.instagram_url:
        strengths.append("Active social media presence (Facebook + Instagram)")
    elif b.facebook_url:
        strengths.append("Active Facebook page")
    return strengths


# ---------------------------------------------------------------------------
# Project value + close probability
# ---------------------------------------------------------------------------

def estimate_project_value(b: Business) -> int:
    lo, hi = _project_value_range(b.category)
    # Bump up if review count suggests established business
    rc = b.review_count or 0
    if rc > 100:
        lo = int(lo * 1.3)
        hi = int(hi * 1.3)
    elif rc > 50:
        lo = int(lo * 1.15)
        hi = int(hi * 1.15)
    return (lo + hi) // 2


def estimate_close_probability(b: Business, scores: dict[str, int]) -> int:
    prob = 25  # baseline
    ws = b.website_status
    if ws == "NO_WEBSITE":   prob += 25
    elif ws == "FACEBOOK_ONLY": prob += 20
    elif ws == "FREE_BUILDER":  prob += 15
    elif scores["opportunity_score"] >= 40:
        prob += 10
    if b.phone: prob += 15
    if b.email: prob += 10
    rc = b.review_count or 0
    if rc > 50: prob += 8
    elif rc > 10: prob += 5
    if b.rating is not None and float(b.rating) >= 4.5:
        prob += 7
    if scores["contact_score"] >= 60: prob += 5
    return _clamp(prob)


# ---------------------------------------------------------------------------
# Sales pitch
# ---------------------------------------------------------------------------

def generate_sales_pitch(b: Business, pain_points: list[str], scores: dict[str, int]) -> str:
    cat = (b.category or "business").lower()
    ws = b.website_status
    name = b.name

    if ws == "NO_WEBSITE":
        return (
            f"{name} has no website at all — they are completely invisible to anyone "
            f"searching for {cat} services online. Lead with the number of potential customers "
            "they're losing every month to competitors who appear in Google. "
            "A simple, fast, mobile-first site with click-to-call will have an immediate impact."
        )
    if ws == "FACEBOOK_ONLY":
        return (
            f"{name} relies entirely on Facebook, which means they have zero Google presence. "
            "Most people searching for a local service never check Facebook — they go straight "
            "to Google. Position a professional website as their missing piece for organic traffic."
        )
    if ws == "FREE_BUILDER":
        return (
            f"{name} is using a free website builder (Wix/Weebly). These look unprofessional "
            "and perform poorly in search results. Highlight the cost of lost credibility and "
            "missed SEO opportunities compared to the one-off investment in a proper website."
        )

    # HAS_WEBSITE — tailor based on worst issues
    issues: list[str] = []
    if b.website_https is False:
        issues.append("no HTTPS — their site shows 'Not Secure' in browsers")
    if b.website_mobile_friendly is False:
        issues.append("not mobile-friendly — the majority of searches are now on mobile")
    if b.website_redesign_score and b.website_redesign_score >= 60:
        issues.append("an old or outdated design that lacks modern trust signals")
    if b.website_has_contact_form is False:
        issues.append("no contact form — customers have no easy way to enquire online")
    if not b.facebook_url and not b.instagram_url:
        issues.append("no social presence to build brand awareness")

    if not issues:
        return (
            f"{name} has a reasonable web presence. Focus the conversation on growth — "
            "improving conversion rates, adding SEO, or expanding their social media "
            "to capture more of the local {cat} market."
        )

    issue_text = "; ".join(issues[:3])
    return (
        f"{name} has a website but it has serious gaps: {issue_text}. "
        f"Open the conversation by asking how many enquiries they currently get online — "
        "then show how fixing these issues directly translates to more inbound leads."
    )


# ---------------------------------------------------------------------------
# Recommended services
# ---------------------------------------------------------------------------

def generate_recommendations(b: Business, pain_points: list[str]) -> list[str]:
    services: list[str] = []
    ws = b.website_status

    if ws == "NO_WEBSITE":
        services += ["New Website Design", "Google Business Profile Setup", "SEO Starter Package"]
    elif ws == "FACEBOOK_ONLY":
        services += ["Professional Website", "Google Business Optimisation", "SEO Starter Package"]
    elif ws == "FREE_BUILDER":
        services += ["Website Redesign (replace free builder)", "SEO Optimisation"]
    else:
        if b.website_redesign_score and b.website_redesign_score >= 60:
            services.append("Website Redesign")
        if b.website_seo_score and b.website_seo_score < 50:
            services.append("SEO Package")
        if b.website_health_score and b.website_health_score < 50:
            services.append("Website Performance Optimisation")

    if b.website_https is False:
        services.append("SSL Certificate Installation")
    if b.website_has_contact_form is False and b.website:
        services.append("Contact Form & Lead Capture")
    if not b.facebook_url:
        services.append("Facebook Business Page Setup")
    if not b.instagram_url:
        services.append("Instagram Profile Setup")
    if not b.email:
        services.append("Professional Email Address")

    # Category-specific recommendations
    cat = (b.category or "").lower()
    if any(k in cat for k in ["restaurant", "cafe", "takeaway", "food"]):
        services.append("Online Menu / Ordering System")
    if any(k in cat for k in ["hotel", "b&b", "guest house", "accommodation"]):
        services.append("Online Booking System")
    if any(k in cat for k in ["plumber", "electrician", "heating", "builder", "trades"]):
        services.append("Emergency Call Button & WhatsApp Integration")
    if any(k in cat for k in ["dental", "doctor", "clinic", "medical"]):
        services.append("Online Appointment Booking")
    if any(k in cat for k in ["salon", "beauty", "hairdress", "barber"]):
        services.append("Online Booking System")

    services.append("Website Maintenance Package")
    # Deduplicate preserving order
    seen: set[str] = set()
    return [s for s in services if not (s in seen or seen.add(s))]  # type: ignore[func-returns-value]


# ---------------------------------------------------------------------------
# Next best action
# ---------------------------------------------------------------------------

def _next_best_action(b: Business, scores: dict[str, int]) -> str:
    if scores["overall_score"] < 20:
        return "Low Priority"
    if not b.website and not b.website_last_checked and not b.last_enriched_at:
        return "Needs Enrichment"
    if b.phone and scores["overall_score"] >= 50:
        return "Call Now"
    if b.email and not b.phone:
        return "Email First"
    if b.phone:
        return "Call Now"
    if b.email:
        return "Email First"
    return "Needs Contact Info"


# ---------------------------------------------------------------------------
# Priority label
# ---------------------------------------------------------------------------

def _priority(overall_score: int) -> str:
    if overall_score >= 70: return "HOT"
    if overall_score >= 50: return "WARM"
    if overall_score >= 30: return "QUALIFIED"
    return "COLD"


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_insight(business: Business, db: Session) -> SalesInsight:
    """Generate or update the SalesInsight for one business. Pure DB read/write — no HTTP."""
    scores = calculate_scores(business)
    pain_points = identify_pain_points(business)
    strengths = identify_strengths(business)
    project_value = estimate_project_value(business)
    close_prob = estimate_close_probability(business, scores)
    pitch = generate_sales_pitch(business, pain_points, scores)
    services = generate_recommendations(business, pain_points)
    nba = _next_best_action(business, scores)
    priority = _priority(scores["overall_score"])

    now = datetime.now(tz=timezone.utc)

    # Upsert the SalesInsight record
    insight = db.get(SalesInsight, {"business_id": business.id})  # type: ignore[call-overload]
    if insight is None:
        insight = db.query(SalesInsight).filter(SalesInsight.business_id == business.id).first()

    if insight is None:
        insight = SalesInsight(business_id=business.id)
        db.add(insight)

    insight.overall_score = scores["overall_score"]
    insight.priority = priority
    insight.website_score = scores["website_score"]
    insight.seo_score = scores["seo_score"]
    insight.trust_score = scores["trust_score"]
    insight.contact_score = scores["contact_score"]
    insight.social_score = scores["social_score"]
    insight.opportunity_score = scores["opportunity_score"]
    insight.pain_points = pain_points
    insight.strengths = strengths
    insight.recommendations = services
    insight.recommended_services = services
    insight.recommended_pitch = pitch
    insight.next_best_action = nba
    insight.estimated_project_value = project_value
    insight.estimated_close_probability = close_prob
    insight.generated_at = now
    insight.updated_at = now

    # Write denormalized columns back to businesses for fast sorting
    db.query(Business).filter(Business.id == business.id).update({
        "ai_score":         scores["overall_score"],
        "ai_priority":      priority,
        "ai_project_value": project_value,
        "ai_close_prob":    close_prob,
    })

    db.commit()
    db.refresh(insight)
    return insight


# ---------------------------------------------------------------------------
# Batch processing (in-memory job state, same pattern as enrichment)
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_job: dict = {
    "running": False, "paused": False, "stop_requested": False,
    "total": 0, "processed": 0, "started_at": None, "current_business": None,
}


def _job_snapshot() -> dict:
    with _lock:
        return dict(_job)


def _update_job(**kwargs: Any) -> None:
    with _lock:
        _job.update(kwargs)


def _batch_worker(business_ids: list[int], db_factory) -> None:
    _update_job(running=True, paused=False, stop_requested=False,
                processed=0, total=len(business_ids),
                started_at=time.time(), current_business=None)
    db: Session = db_factory()
    try:
        for bid in business_ids:
            snap = _job_snapshot()
            if snap["stop_requested"]:
                break
            while snap["paused"] and not snap["stop_requested"]:
                time.sleep(0.3)
                snap = _job_snapshot()
            business = db.get(Business, bid)
            if not business:
                with _lock:
                    _job["processed"] += 1
                continue
            _update_job(current_business=business.name)
            try:
                generate_insight(business, db)
            except Exception as exc:
                logger.error("Sales insight error for %s: %s", bid, exc)
            with _lock:
                _job["processed"] += 1
    finally:
        db.close()
        _update_job(running=False, current_business=None)


def generate_batch(business_ids: list[int], db_factory) -> None:
    snap = _job_snapshot()
    if snap["running"]:
        return
    t = threading.Thread(target=_batch_worker, args=(business_ids, db_factory), daemon=True)
    t.start()


def pause_job() -> None:
    _update_job(paused=True)


def resume_job() -> None:
    _update_job(paused=False)


def stop_job() -> None:
    _update_job(stop_requested=True, paused=False)


def get_batch_status(db: Session):
    from app.schemas.sales_insight import SalesInsightBatchStatus
    snap = _job_snapshot()
    elapsed = (time.time() - snap["started_at"]) if snap["started_at"] else 0.0

    total_businesses = db.scalar(select(func.count(Business.id))) or 0
    insights_count = db.scalar(select(func.count(SalesInsight.id))) or 0
    avg_score = db.scalar(select(func.avg(SalesInsight.overall_score))) or 0.0
    avg_value = db.scalar(select(func.avg(SalesInsight.estimated_project_value))) or 0.0
    hot = db.scalar(select(func.count(SalesInsight.id)).where(SalesInsight.priority == "HOT")) or 0
    warm = db.scalar(select(func.count(SalesInsight.id)).where(SalesInsight.priority == "WARM")) or 0

    return SalesInsightBatchStatus(
        running=snap["running"],
        paused=snap["paused"],
        total=snap["total"],
        processed=snap["processed"],
        elapsed_seconds=round(elapsed, 1),
        current_business=snap["current_business"],
        total_businesses=total_businesses,
        insights_generated=insights_count,
        avg_overall_score=round(float(avg_score), 1),
        avg_project_value=round(float(avg_value), 0),
        hot_count=hot,
        warm_count=warm,
    )
