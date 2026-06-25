"""
Scrapes yell.com UK business directory using Playwright (headless Chromium).

Yell URL pattern:
  https://www.yell.com/ucs/UcsSearchAction.do?keywords=<keyword>&location=<location>&pageNum=<n>

Each page returns up to 25 results. We scrape up to YELL_MAX_PAGES pages per search.
"""
import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import quote_plus

from playwright.sync_api import TimeoutError as PlaywrightTimeout, sync_playwright

from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)

YELL_MAX_PAGES = 4
YELL_NAV_TIMEOUT = 60_000   # ms — full page navigation
YELL_CARD_TIMEOUT = 20_000  # ms — wait for first business card


class YellProvider:
    source = "yell"

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        leads: list[ProviderLead] = []
        seen_names: set[str] = set()

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    ),
                    locale="en-GB",
                    extra_http_headers={"Accept-Language": "en-GB,en;q=0.9"},
                )
                page = context.new_page()

                for page_num in range(1, YELL_MAX_PAGES + 1):
                    url = _build_url(keyword=keyword, location=location, page=page_num)
                    logger.info("Yell: fetching page %d — %s", page_num, url)

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=YELL_NAV_TIMEOUT)
                    except Exception as exc:
                        raise LeadProviderError(f"Yell navigation error: {exc}") from exc

                    title = page.title()
                    if "cloudflare" in title.lower() or "attention required" in title.lower():
                        raise LeadProviderError(
                            "Yell.com is protected by Cloudflare, which blocks automated browsers "
                            "from datacenter/container IPs. "
                            "Use Google Maps (requires API key) or CSV import instead."
                        )

                    try:
                        page.wait_for_selector(
                            "article.businessCapsule, [data-tracking='businessListing']",
                            timeout=YELL_CARD_TIMEOUT,
                        )
                    except PlaywrightTimeout:
                        logger.warning("Yell: timeout waiting for results on page %d — stopping", page_num)
                        break

                    page_leads = _extract_leads(page, fallback_city=location)
                    if not page_leads:
                        logger.info("Yell: no results on page %d — stopping", page_num)
                        break

                    for lead in page_leads:
                        key = lead.name.casefold()
                        if key not in seen_names:
                            seen_names.add(key)
                            leads.append(lead)

                browser.close()

        except LeadProviderError:
            raise
        except Exception as exc:
            raise LeadProviderError(f"Yell scraper error: {exc}") from exc

        logger.info("Yell: found %d unique leads for '%s' in '%s'", len(leads), keyword, location)
        return leads


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_url(*, keyword: str, location: str, page: int) -> str:
    return (
        "https://www.yell.com/ucs/UcsSearchAction.do"
        f"?keywords={quote_plus(keyword.strip())}"
        f"&location={quote_plus(location.strip())}"
        f"&pageNum={page}"
    )


def _extract_leads(page, *, fallback_city: str) -> list[ProviderLead]:
    cards = page.query_selector_all("article.businessCapsule")
    if not cards:
        cards = page.query_selector_all("[data-tracking='businessListing']")

    leads = []
    for card in cards:
        lead = _parse_card(card, fallback_city=fallback_city)
        if lead is not None:
            leads.append(lead)
    return leads


def _parse_card(card, *, fallback_city: str) -> ProviderLead | None:
    # --- Name ---
    name_el = (
        card.query_selector("h2.businessCapsule--name a")
        or card.query_selector("h2.businessCapsule--name")
        or card.query_selector("[class*='businessName']")
        or card.query_selector("h2")
    )
    if name_el is None:
        return None
    name = (name_el.inner_text() or "").strip()
    if not name:
        return None

    # --- Phone ---
    phone_el = (
        card.query_selector("a[href^='tel:']")
        or card.query_selector("[class*='phone']")
        or card.query_selector("[data-tracking*='phone']")
    )
    phone: str | None = None
    if phone_el:
        href = phone_el.get_attribute("href") or ""
        if href.startswith("tel:"):
            phone = href[4:].strip() or None
        else:
            phone = (phone_el.inner_text() or "").strip() or None

    # --- Address / city ---
    address_el = (
        card.query_selector("[class*='address']")
        or card.query_selector("address")
        or card.query_selector("[itemprop='address']")
    )
    raw_address = (address_el.inner_text() or "").strip() if address_el else ""
    city = _extract_city(raw_address) or fallback_city

    # --- Website ---
    website_el = (
        card.query_selector("a[data-tracking*='website']")
        or card.query_selector("a.businessCapsule--website")
    )
    website: str | None = None
    if website_el:
        website = (website_el.get_attribute("href") or "").strip() or None

    # --- Category ---
    category_el = (
        card.query_selector("[class*='category']")
        or card.query_selector("[class*='Classification']")
    )
    category: str | None = None
    if category_el:
        category = (category_el.inner_text() or "").strip() or None

    # --- Rating / reviews ---
    rating: Decimal | None = None
    review_count = 0
    rating_el = (
        card.query_selector("[aria-label*='out of 5']")
        or card.query_selector("[class*='rating']")
    )
    if rating_el:
        aria = rating_el.get_attribute("aria-label") or ""
        m = re.search(r"([\d.]+)\s+out of\s+5", aria, re.I)
        if m:
            rating = _safe_decimal(m.group(1))
        if rating is None:
            rating = _safe_decimal((rating_el.inner_text() or "").strip())

    review_el = (
        card.query_selector("[class*='ratingCount']")
        or card.query_selector("[class*='reviewCount']")
    )
    if review_el:
        review_count = _parse_int((review_el.inner_text() or "").strip())

    # --- Yell detail URL (stored in google_maps_url field) ---
    detail_link_el = (
        card.query_selector("h2 a")
        or card.query_selector("a.businessCapsule--title")
    )
    detail_url: str | None = None
    if detail_link_el:
        href = detail_link_el.get_attribute("href") or ""
        if href:
            detail_url = f"https://www.yell.com{href}" if href.startswith("/") else href

    return ProviderLead(
        name=name,
        phone=phone,
        website=website,
        address=raw_address or None,
        city=city,
        country="United Kingdom",
        category=category,
        rating=rating,
        review_count=review_count,
        google_maps_url=detail_url,
    )


def _extract_city(address: str) -> str | None:
    """Best-effort extract city from a UK address string (last non-postcode segment)."""
    if not address:
        return None
    parts = [p.strip() for p in address.split(",")]
    for part in reversed(parts):
        if re.match(r"^[A-Z]{1,2}\d", part):
            continue
        if part:
            return part
    return None


def _safe_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^\d.]", "", str(value))
    try:
        return Decimal(cleaned) if cleaned else None
    except InvalidOperation:
        return None


def _parse_int(value: str) -> int:
    cleaned = re.sub(r"[^\d]", "", value)
    try:
        return int(cleaned) if cleaned else 0
    except ValueError:
        return 0
