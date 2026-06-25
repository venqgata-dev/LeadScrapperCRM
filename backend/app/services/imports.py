import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import WebsiteStatus
from app.models.business import Business
from app.providers.base import ProviderLead
from app.providers.localization import expand_keywords, get_language_code
from app.providers.neighbors import get_neighbors
from app.providers.registry import get_lead_provider
from app.schemas.business import LeadImportResponse, SearchAnalytics, SearchResponse, SearchResultLead
from app.services.businesses import calculate_lead_score

logger = logging.getLogger(__name__)

FREE_BUILDER_KEYWORDS = ("wix", "weebly", "site123", "yola")
FACEBOOK_KEYWORD = "facebook.com"


@dataclass(frozen=True)
class ClassifiedLead:
    lead: ProviderLead
    website_status: WebsiteStatus
    lead_score: int
    opportunity_reason: str

    @property
    def dedupe_key(self) -> tuple[str, str]:
        normalized_phone = normalize_phone(self.lead.phone)
        if normalized_phone:
            return ("phone", normalized_phone)
        return ("name", self.lead.name.casefold())


def import_leads(
    db: Session,
    *,
    source: str,
    keyword: str,
    location: str,
) -> LeadImportResponse:
    provider = get_lead_provider(source)
    provider_leads = provider.search(keyword=keyword, location=location)

    imported = 0
    updated = 0
    skipped = 0
    seen_keys: set[tuple[str, str]] = set()

    for provider_lead in provider_leads:
        if not provider_lead.name.strip():
            skipped += 1
            continue

        classified_lead = classify_lead(provider_lead)
        batch_key = classified_lead.dedupe_key
        if batch_key in seen_keys:
            skipped += 1
            continue
        seen_keys.add(batch_key)

        existing_business = find_existing_business(db, provider_lead)
        if existing_business is None:
            db.add(build_business(classified_lead))
            imported += 1
        else:
            update_business(existing_business, classified_lead)
            updated += 1

    db.commit()
    return LeadImportResponse(imported=imported, updated=updated, skipped=skipped)


def classify_lead(lead: ProviderLead) -> ClassifiedLead:
    website_status = classify_website_status(lead.website)
    lead_score = calculate_lead_score(
        website_status, lead.review_count, lead.rating,
        phone=lead.phone, email=lead.email,
    )
    opportunity_reason = build_opportunity_reason(website_status, lead.website)
    return ClassifiedLead(
        lead=lead,
        website_status=website_status,
        lead_score=lead_score,
        opportunity_reason=opportunity_reason,
    )


def classify_website_status(website: str | None) -> WebsiteStatus:
    if not website:
        return WebsiteStatus.NO_WEBSITE

    normalized_website = website.casefold()
    if FACEBOOK_KEYWORD in normalized_website:
        return WebsiteStatus.FACEBOOK_ONLY

    if any(keyword in normalized_website for keyword in FREE_BUILDER_KEYWORDS):
        return WebsiteStatus.FREE_BUILDER

    return WebsiteStatus.HAS_WEBSITE


def build_opportunity_reason(
    website_status: WebsiteStatus,
    website: str | None,
) -> str:
    if website_status == WebsiteStatus.NO_WEBSITE:
        return "No website found"
    if website_status == WebsiteStatus.FACEBOOK_ONLY:
        return "Facebook page only"
    if website_status == WebsiteStatus.FREE_BUILDER:
        normalized_website = (website or "").casefold()
        if "wix" in normalized_website:
            return "Free Wix website"
        if "weebly" in normalized_website:
            return "Free Weebly website"
        if "site123" in normalized_website:
            return "Free Site123 website"
        if "yola" in normalized_website:
            return "Free Yola website"
        return "Free builder website"
    return "Website found"


def find_existing_business(db: Session, lead: ProviderLead) -> Business | None:
    normalized_phone = normalize_phone(lead.phone)
    filters = [func.lower(Business.name) == lead.name.lower()]

    if normalized_phone:
        filters.insert(
            0,
            func.regexp_replace(
                func.coalesce(Business.phone, ""),
                "[^0-9+]",
                "",
                "g",
            )
            == normalized_phone,
        )

    statement = select(Business).where(or_(*filters))
    return db.scalars(statement).first()


def build_business(classified_lead: ClassifiedLead) -> Business:
    business = Business(name=classified_lead.lead.name)
    update_business(business, classified_lead)
    return business


def update_business(business: Business, classified_lead: ClassifiedLead) -> None:
    lead = classified_lead.lead
    business.name = lead.name
    business.phone = lead.phone
    business.email = lead.email
    business.website = lead.website
    business.address = lead.address
    business.city = lead.city
    business.country = lead.country
    business.category = lead.category
    business.rating = lead.rating
    business.review_count = lead.review_count
    business.google_maps_url = lead.google_maps_url
    business.facebook_url = lead.facebook_url
    business.instagram_url = lead.instagram_url
    business.linkedin_url = lead.linkedin_url
    business.website_status = classified_lead.website_status.value
    business.lead_score = classified_lead.lead_score
    business.opportunity_reason = classified_lead.opportunity_reason
    business.website_checked_at = datetime.now(UTC)


def search_leads(
    *,
    source: str,
    keyword: str,
    location: str,
    country: str | None = None,
    radius_km: int = 0,
    expand_neighbors: bool = False,
    use_keyword_expansion: bool = True,
) -> SearchResponse:
    """Search a provider and return classified results without saving to the DB.

    Supports two expansion axes:
    - use_keyword_expansion: run one query per related keyword (e.g. "plumber" →
      "plumber", "emergency plumber", "plumbing services", …)
    - expand_neighbors: also search surrounding towns of the primary city.

    Results from all sub-searches are merged with three-way deduplication:
    phone, normalised website URL, and business name.
    """
    from collections import Counter

    provider = get_lead_provider(source)
    language_code = get_language_code(country)

    # --- Keyword list ---
    if use_keyword_expansion:
        keywords = expand_keywords(keyword, country)
    else:
        keywords = [keyword.strip()]

    # --- Location list (primary city + optional neighbors) ---
    primary_city = location.split(",")[0].strip()
    locations: list[str] = [location]
    if expand_neighbors:
        neighbor_towns = get_neighbors(primary_city, country)
        for town in neighbor_towns:
            # Append country suffix so provider gets a well-formed location string
            suffix = f", {country}" if country else ""
            locations.append(f"{town}{suffix}")
    cities_searched = [loc.split(",")[0].strip() for loc in locations]

    logger.info(
        "search_leads: source=%s keyword=%r → %d keywords × %d locations",
        source, keyword, len(keywords), len(locations),
    )

    seen_keys: set[tuple[str, str]] = set()
    seen_websites: set[str] = set()
    results: list[SearchResultLead] = []
    raw_total = 0

    for loc in locations:
        for kw in keywords:
            if source == "google_maps":
                kwargs: dict = {"language_code": language_code}
                if radius_km > 0:
                    kwargs["radius_km"] = radius_km
                provider_leads = provider.search(keyword=kw, location=loc, **kwargs)  # type: ignore[call-arg]
            else:
                provider_leads = provider.search(keyword=kw, location=loc)

            raw_total += len(provider_leads)

            for provider_lead in provider_leads:
                if not provider_lead.name.strip():
                    continue

                classified = classify_lead(provider_lead)

                batch_key = classified.dedupe_key
                if batch_key in seen_keys:
                    continue

                norm_url = _normalize_url(provider_lead.website)
                if norm_url and norm_url in seen_websites:
                    continue

                seen_keys.add(batch_key)
                if norm_url:
                    seen_websites.add(norm_url)

                lead = classified.lead
                results.append(
                    SearchResultLead(
                        name=lead.name,
                        phone=lead.phone,
                        email=lead.email,
                        website=lead.website,
                        website_status=classified.website_status,
                        address=lead.address,
                        city=lead.city,
                        country=lead.country or country,
                        category=lead.category,
                        rating=lead.rating,
                        review_count=lead.review_count,
                        lead_score=classified.lead_score,
                        opportunity_reason=classified.opportunity_reason,
                        google_maps_url=lead.google_maps_url,
                        facebook_url=lead.facebook_url,
                        instagram_url=lead.instagram_url,
                        linkedin_url=lead.linkedin_url,
                    )
                )

    status_counts = Counter(r.website_status.value for r in results)
    opp_count = (
        status_counts.get("NO_WEBSITE", 0)
        + status_counts.get("FACEBOOK_ONLY", 0)
        + status_counts.get("FREE_BUILDER", 0)
    )
    logger.info(
        "search_leads: %d raw → %d deduped | opps=%d NO_WEBSITE=%d FB=%d FREE=%d HAS=%d | cities=%s",
        raw_total, len(results), opp_count,
        status_counts.get("NO_WEBSITE", 0),
        status_counts.get("FACEBOOK_ONLY", 0),
        status_counts.get("FREE_BUILDER", 0),
        status_counts.get("HAS_WEBSITE", 0),
        cities_searched,
    )

    analytics = SearchAnalytics(
        raw_count=raw_total,
        deduped_count=len(results),
        opportunities=opp_count,
        no_website=status_counts.get("NO_WEBSITE", 0),
        facebook_only=status_counts.get("FACEBOOK_ONLY", 0),
        free_builder=status_counts.get("FREE_BUILDER", 0),
        cities_searched=cities_searched,
        keywords_used=keywords,
    )
    return SearchResponse(leads=results, analytics=analytics)


def _normalize_url(url: str | None) -> str:
    """Strip scheme, www., and trailing slash for URL-level deduplication."""
    if not url:
        return ""
    normalized = url.lower().strip()
    for prefix in ("https://", "http://"):
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):]
            break
    if normalized.startswith("www."):
        normalized = normalized[4:]
    return normalized.rstrip("/")


def batch_import_leads(
    db: Session,
    leads: list[SearchResultLead],
) -> LeadImportResponse:
    """Persist a list of pre-classified SearchResultLeads into the database."""
    imported = 0
    updated = 0
    skipped = 0
    seen_keys: set[tuple[str, str]] = set()

    for result_lead in leads:
        if not result_lead.name.strip():
            skipped += 1
            continue

        # Re-use dedupe key logic
        norm_phone = normalize_phone(result_lead.phone)
        batch_key: tuple[str, str] = (
            ("phone", norm_phone) if norm_phone else ("name", result_lead.name.casefold())
        )
        if batch_key in seen_keys:
            skipped += 1
            continue
        seen_keys.add(batch_key)

        # Convert SearchResultLead → ProviderLead for find_existing_business
        provider_lead = ProviderLead(
            name=result_lead.name,
            phone=result_lead.phone,
            email=result_lead.email,
            website=result_lead.website,
            address=result_lead.address,
            city=result_lead.city,
            country=result_lead.country,
            category=result_lead.category,
            rating=result_lead.rating,
            review_count=result_lead.review_count,
            google_maps_url=result_lead.google_maps_url,
            facebook_url=result_lead.facebook_url,
            instagram_url=result_lead.instagram_url,
            linkedin_url=result_lead.linkedin_url,
        )
        classified = ClassifiedLead(
            lead=provider_lead,
            website_status=result_lead.website_status,
            lead_score=result_lead.lead_score,
            opportunity_reason=result_lead.opportunity_reason,
        )

        existing = find_existing_business(db, provider_lead)
        if existing is None:
            db.add(build_business(classified))
            imported += 1
        else:
            update_business(existing, classified)
            updated += 1

    db.commit()
    return LeadImportResponse(imported=imported, updated=updated, skipped=skipped)


def normalize_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return "".join(character for character in phone if character.isdigit() or character == "+")
