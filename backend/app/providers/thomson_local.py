"""
Scrapes thomsonlocal.com UK business directory using httpx + BeautifulSoup.

URL pattern:
  https://www.thomsonlocal.com/search/<keyword>/<location>

Results use Schema.org microdata (itemscope / itemprop). Thomson Local
rate-limits subsequent requests from the same IP, so we get at most one
page (~20 results) per keyword.
"""
import logging
import re
import time
from decimal import Decimal, InvalidOperation

import httpx
from bs4 import BeautifulSoup

from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)

_BASE = "https://www.thomsonlocal.com"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}


class ThomsonLocalProvider:
    source = "thomson_local"

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        url = _build_url(keyword, location)
        logger.info("ThomsonLocal: fetching %s", url)
        try:
            resp = httpx.get(url, headers=_HEADERS, follow_redirects=True, timeout=20)
        except httpx.HTTPError as exc:
            raise LeadProviderError(f"Thomson Local request failed: {exc}") from exc

        if resp.status_code == 401:
            raise LeadProviderError(
                "Thomson Local blocked this request (401). The directory rate-limits "
                "requests from shared/datacenter IPs after the first page. "
                "Try Google Maps (requires API key) or CSV import instead."
            )
        if resp.status_code != 200:
            raise LeadProviderError(
                f"Thomson Local returned HTTP {resp.status_code}."
            )

        leads = _parse_page(resp.text, fallback_city=location)
        logger.info(
            "ThomsonLocal: found %d leads for '%s' in '%s'",
            len(leads), keyword, location,
        )
        return leads


def _build_url(keyword: str, location: str) -> str:
    kw = keyword.strip().replace(" ", "-").replace("&", "and").lower()
    loc = location.strip().replace(" ", "-").lower()
    return f"{_BASE}/search/{kw}/{loc}"


def _parse_page(html: str, *, fallback_city: str) -> list[ProviderLead]:
    soup = BeautifulSoup(html, "lxml")
    cards = soup.select("li[itemscope][itemtype*='LocalBusiness'], li.listing.clearFix[itemscope]")
    if not cards:
        # broader fallback
        cards = soup.select("[itemscope][itemtype*='LocalBusiness']")

    leads = []
    for card in cards:
        lead = _parse_card(card, fallback_city=fallback_city)
        if lead is not None:
            leads.append(lead)
    return leads


def _parse_card(card, *, fallback_city: str) -> ProviderLead | None:
    # Name
    name_el = card.select_one("[itemprop='name']")
    if name_el is None:
        return None
    name = name_el.get_text(strip=True)
    if not name:
        return None

    # Phone
    phone: str | None = None
    phone_el = card.select_one("a[href^='tel:']")
    if phone_el:
        phone = phone_el["href"][4:].strip() or None

    # Website (itemprop="sameAs" or rel="nofollow" external link)
    website: str | None = None
    website_el = card.select_one("a[itemprop='sameAs']") or card.select_one("a[rel='nofollow'][href^='http']")
    if website_el:
        href = str(website_el.get("href", "")).strip()
        if href.startswith("http") and "thomsonlocal" not in href.lower():
            website = href

    # Address
    address: str | None = None
    addr_el = card.select_one("[itemprop='address'], div.address, .address")
    if addr_el:
        address = addr_el.get_text(separator=" ", strip=True) or None

    city = _extract_city(address) or fallback_city

    # Rating
    rating: Decimal | None = None
    rating_el = card.select_one("[itemprop='ratingValue']")
    if rating_el:
        rating = _safe_decimal(rating_el.get_text(strip=True))

    # Review count
    review_count = 0
    review_el = card.select_one("[itemprop='reviewCount'], .reviewCount, .ratingCount")
    if review_el:
        review_count = _parse_int(review_el.get_text(strip=True))

    # Profile URL → stored in google_maps_url field
    profile_url: str | None = None
    profile_el = card.select_one("a[itemprop='url'], h2 a, .businessName a")
    if profile_el:
        href = str(profile_el.get("href", "")).strip()
        if href:
            profile_url = href if href.startswith("http") else f"{_BASE}{href}"

    return ProviderLead(
        name=name,
        phone=phone,
        website=website,
        address=address,
        city=city,
        country="United Kingdom",
        rating=rating,
        review_count=review_count,
        google_maps_url=profile_url,
    )


def _extract_city(address: str | None) -> str | None:
    if not address:
        return None
    parts = [p.strip() for p in address.split(",")]
    for part in reversed(parts):
        if re.match(r"^[A-Z]{1,2}\d", part):
            continue
        if part:
            return part
    return None


def _safe_decimal(value: str | None) -> Decimal | None:
    if not value:
        return None
    cleaned = re.sub(r"[^\d.]", "", value)
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
