"""Lead Enrichment Engine — discovers email, Facebook, Instagram, LinkedIn from business websites.

Designed as a reusable framework. Future modules (CMS detection, Google Reviews, VAT, etc.)
should extend enrich_business() by adding new discover_* helpers.
"""
from __future__ import annotations

import logging
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.business import Business
from app.schemas.enrichment import EnrichmentJobStatus, EnrichmentResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ACCEPT_EMAIL_PREFIXES = {"info", "sales", "hello", "office", "contact", "admin"}
REJECT_EMAIL_PREFIXES = {"noreply", "no-reply", "norepply", "support", "webmaster", "donotreply"}

SOCIAL_SKIP_FRAGMENTS = {
    "sharer", "share", "login", "accounts", "signup", "register",
    "plugins", "dialog", "intent", "hashtag", "explore",
}

CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us"]

HTTP_TIMEOUT = 10.0
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LeadScrapper/1.0; +https://leadscrapper.io)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.5",
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
SRC_RE = re.compile(r'src=["\']([^"\']+)["\']', re.IGNORECASE)

SKIP_AFTER_30_DAYS = 30  # days

# ---------------------------------------------------------------------------
# In-memory job state (single background job at a time)
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_job: dict = {
    "running": False,
    "paused": False,
    "stop_requested": False,
    "total": 0,
    "processed": 0,
    "emails_found": 0,
    "facebook_found": 0,
    "instagram_found": 0,
    "linkedin_found": 0,
    "started_at": None,
    "current_business": None,
}


def _job_snapshot() -> dict:
    with _lock:
        return dict(_job)


def _update_job(**kwargs: object) -> None:
    with _lock:
        _job.update(kwargs)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _fetch_html(url: str, client: httpx.Client) -> str | None:
    try:
        r = client.get(url, timeout=HTTP_TIMEOUT, follow_redirects=True)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return r.text
    except Exception:
        pass
    return None


def _collect_html(base_url: str, client: httpx.Client) -> str:
    """Return concatenated HTML from homepage + contact/about pages."""
    parts: list[str] = []
    home = _fetch_html(base_url, client)
    if home:
        parts.append(home)
    for path in CONTACT_PATHS:
        page = _fetch_html(urljoin(base_url, path), client)
        if page:
            parts.append(page)
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Email discovery
# ---------------------------------------------------------------------------

def _extract_emails(html: str) -> list[str]:
    """Extract all email addresses from HTML, ranked by preference."""
    found: set[str] = set()

    # mailto: links
    for href in HREF_RE.findall(html):
        href = href.strip()
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if addr:
                found.add(addr)

    # plain text emails
    for m in EMAIL_RE.finditer(html):
        found.add(m.group(0).lower())

    accepted: list[str] = []
    others: list[str] = []

    for email in found:
        local = email.split("@")[0]
        if any(local == p or local.startswith(p + ".") for p in REJECT_EMAIL_PREFIXES):
            continue
        if any(local == p or local.startswith(p) for p in ACCEPT_EMAIL_PREFIXES):
            accepted.append(email)
        else:
            others.append(email)

    return accepted + others


def discover_email(business: Business, db: Session) -> bool:
    """Discover and save an email address for a business. Returns True if found."""
    if business.email:
        return False
    if not business.website:
        db.query(Business).filter(Business.id == business.id).update({"email_checked": True})
        db.commit()
        return False

    with httpx.Client(headers=HTTP_HEADERS) as client:
        html = _collect_html(business.website, client)

    emails = _extract_emails(html)
    found = bool(emails)

    updates: dict = {"email_checked": True}
    if found:
        updates["email"] = emails[0]
        updates["email_source"] = "website"

    db.query(Business).filter(Business.id == business.id).update(updates)
    db.commit()
    return found


# ---------------------------------------------------------------------------
# Social link discovery
# ---------------------------------------------------------------------------

_FACEBOOK_SKIP = re.compile(
    r"facebook\.com/(sharer|share|login|dialog|plugins|groups/join|pages/create|events/|hashtag/)",
    re.IGNORECASE,
)
_INSTAGRAM_SKIP = re.compile(
    r"instagram\.com/(accounts/|explore/|p/|reel/|tv/)",
    re.IGNORECASE,
)
_LINKEDIN_SKIP = re.compile(
    r"linkedin\.com/(shareArticle|login|signup|uas/login|feed/)",
    re.IGNORECASE,
)


def _extract_social_links(html: str) -> dict[str, str | None]:
    """Parse HTML and return the first valid social URL for each platform."""
    facebook: str | None = None
    instagram: str | None = None
    linkedin: str | None = None

    for href in HREF_RE.findall(html):
        href = href.strip()
        if not href.startswith("http"):
            continue

        if not facebook and "facebook.com" in href and not _FACEBOOK_SKIP.search(href):
            p = urlparse(href)
            # must have a path segment beyond /
            if p.path and p.path.strip("/"):
                facebook = href

        if not instagram and "instagram.com" in href and not _INSTAGRAM_SKIP.search(href):
            p = urlparse(href)
            if p.path and p.path.strip("/"):
                instagram = href

        if not linkedin and ("linkedin.com/company" in href or "linkedin.com/in/" in href) and not _LINKEDIN_SKIP.search(href):
            linkedin = href

    return {"facebook": facebook, "instagram": instagram, "linkedin": linkedin}


def discover_social_links(business: Business, db: Session) -> dict[str, bool]:
    """Discover and save social links for a business. Returns dict of what was found."""
    all_filled = business.facebook_url and business.instagram_url and business.linkedin_url
    if all_filled:
        return {"facebook": False, "instagram": False, "linkedin": False}

    if not business.website:
        db.query(Business).filter(Business.id == business.id).update({"social_checked": True})
        db.commit()
        return {"facebook": False, "instagram": False, "linkedin": False}

    with httpx.Client(headers=HTTP_HEADERS) as client:
        html = _collect_html(business.website, client)

    links = _extract_social_links(html)
    results = {"facebook": False, "instagram": False, "linkedin": False}
    updates: dict = {"social_checked": True}

    if not business.facebook_url and links["facebook"]:
        updates["facebook_url"] = links["facebook"]
        updates["facebook_found"] = True
        results["facebook"] = True

    if not business.instagram_url and links["instagram"]:
        updates["instagram_url"] = links["instagram"]
        updates["instagram_found"] = True
        results["instagram"] = True

    if not business.linkedin_url and links["linkedin"]:
        updates["linkedin_url"] = links["linkedin"]
        updates["linkedin_found"] = True
        results["linkedin"] = True

    db.query(Business).filter(Business.id == business.id).update(updates)
    db.commit()
    return results


# ---------------------------------------------------------------------------
# Single-business enrichment
# ---------------------------------------------------------------------------

def enrich_business(business_id: int, db: Session) -> EnrichmentResult:
    """Enrich a single business. Only updates empty fields. Never creates records."""
    t0 = time.perf_counter()
    business = db.get(Business, business_id)
    if not business:
        raise ValueError(f"Business {business_id} not found")

    email_found = False
    social_results: dict[str, bool] = {"facebook": False, "instagram": False, "linkedin": False}
    error: str | None = None

    db.query(Business).filter(Business.id == business_id).update({"enrichment_status": "running"})
    db.commit()

    try:
        email_found = discover_email(business, db)
        db.refresh(business)
        social_results = discover_social_links(business, db)
    except Exception as exc:
        error = str(exc)
        logger.warning("Enrichment error for business %s: %s", business_id, exc)

    elapsed = time.perf_counter() - t0

    db.query(Business).filter(Business.id == business_id).update({
        "enrichment_status": "failed" if error else "done",
        "last_enriched_at": datetime.now(tz=timezone.utc),
        "website_checked": True,
    })
    db.commit()

    db.refresh(business)

    logger.info(
        "Enriched business %s | %s | email=%s fb=%s ig=%s li=%s | %.1fs",
        business_id, business.name, email_found,
        social_results["facebook"], social_results["instagram"], social_results["linkedin"],
        elapsed,
    )

    return EnrichmentResult(
        business_id=business_id,
        business_name=business.name,
        email_found=email_found,
        facebook_found=social_results["facebook"],
        instagram_found=social_results["instagram"],
        linkedin_found=social_results["linkedin"],
        elapsed_seconds=round(elapsed, 2),
        error=error,
    )


# ---------------------------------------------------------------------------
# Batch enrichment
# ---------------------------------------------------------------------------

def _batch_worker(business_ids: list[int], db_factory) -> None:
    """Background thread that runs batch enrichment."""
    from app.db.session import SessionLocal  # avoid circular at import time

    _update_job(running=True, paused=False, stop_requested=False, processed=0,
                emails_found=0, facebook_found=0, instagram_found=0, linkedin_found=0,
                total=len(business_ids), started_at=time.time(), current_business=None)

    db: Session = db_factory()
    try:
        for bid in business_ids:
            snap = _job_snapshot()
            if snap["stop_requested"]:
                break
            while snap["paused"] and not snap["stop_requested"]:
                time.sleep(0.5)
                snap = _job_snapshot()

            business = db.get(Business, bid)
            if not business:
                with _lock:
                    _job["processed"] += 1
                continue

            _update_job(current_business=business.name)
            try:
                result = enrich_business(bid, db)
                with _lock:
                    _job["processed"] += 1
                    if result.email_found:
                        _job["emails_found"] += 1
                    if result.facebook_found:
                        _job["facebook_found"] += 1
                    if result.instagram_found:
                        _job["instagram_found"] += 1
                    if result.linkedin_found:
                        _job["linkedin_found"] += 1
            except Exception as exc:
                logger.error("Batch enrichment error for %s: %s", bid, exc)
                with _lock:
                    _job["processed"] += 1
    finally:
        db.close()
        _update_job(running=False, current_business=None)


def enrich_batch(business_ids: list[int], db_factory) -> None:
    """Start background enrichment for a list of business IDs.
    Silently no-ops if a job is already running."""
    snap = _job_snapshot()
    if snap["running"]:
        return
    t = threading.Thread(target=_batch_worker, args=(business_ids, db_factory), daemon=True)
    t.start()


# ---------------------------------------------------------------------------
# Job control
# ---------------------------------------------------------------------------

def pause_job() -> None:
    _update_job(paused=True)


def resume_job() -> None:
    _update_job(paused=False)


def stop_job() -> None:
    _update_job(stop_requested=True, paused=False)


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

def get_job_status(db: Session) -> EnrichmentJobStatus:
    snap = _job_snapshot()
    elapsed = (time.time() - snap["started_at"]) if snap["started_at"] else 0.0

    total_businesses = db.scalar(select(func.count(Business.id))) or 0
    enriched = db.scalar(select(func.count(Business.id)).where(Business.last_enriched_at.isnot(None))) or 0
    total_emails = db.scalar(select(func.count(Business.id)).where(Business.email.isnot(None))) or 0
    total_fb = db.scalar(select(func.count(Business.id)).where(Business.facebook_url.isnot(None))) or 0
    total_ig = db.scalar(select(func.count(Business.id)).where(Business.instagram_url.isnot(None))) or 0
    total_li = db.scalar(select(func.count(Business.id)).where(Business.linkedin_url.isnot(None))) or 0

    return EnrichmentJobStatus(
        running=snap["running"],
        paused=snap["paused"],
        total=snap["total"],
        processed=snap["processed"],
        emails_found=snap["emails_found"],
        facebook_found=snap["facebook_found"],
        instagram_found=snap["instagram_found"],
        linkedin_found=snap["linkedin_found"],
        elapsed_seconds=round(elapsed, 1),
        current_business=snap["current_business"],
        total_businesses=total_businesses,
        enriched_businesses=enriched,
        total_emails=total_emails,
        total_facebook=total_fb,
        total_instagram=total_ig,
        total_linkedin=total_li,
    )


# ---------------------------------------------------------------------------
# Query helpers (used by API to build batch lists)
# ---------------------------------------------------------------------------

def _should_skip(business: Business) -> bool:
    """Skip if enriched within the last 30 days and all fields are populated."""
    if business.last_enriched_at is None:
        return False
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=SKIP_AFTER_30_DAYS)
    if business.last_enriched_at < cutoff:
        return False
    all_filled = (
        business.email is not None
        and business.facebook_url is not None
        and business.instagram_url is not None
        and business.linkedin_url is not None
    )
    return all_filled


def get_all_enrichable_ids(db: Session) -> list[int]:
    rows = db.execute(select(Business.id, Business.email, Business.facebook_url,
                             Business.instagram_url, Business.linkedin_url,
                             Business.last_enriched_at)).all()
    return [r.id for r in rows if not _should_skip_row(r)]


def _should_skip_row(row) -> bool:
    if row.last_enriched_at is None:
        return False
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=SKIP_AFTER_30_DAYS)
    if row.last_enriched_at < cutoff:
        return False
    return (row.email is not None and row.facebook_url is not None
            and row.instagram_url is not None and row.linkedin_url is not None)


def get_missing_email_ids(db: Session) -> list[int]:
    rows = db.execute(select(Business.id).where(Business.email.is_(None))).all()
    return [r.id for r in rows]


def get_missing_social_ids(db: Session) -> list[int]:
    rows = db.execute(
        select(Business.id).where(
            (Business.facebook_url.is_(None)) |
            (Business.instagram_url.is_(None)) |
            (Business.linkedin_url.is_(None))
        )
    ).all()
    return [r.id for r in rows]
