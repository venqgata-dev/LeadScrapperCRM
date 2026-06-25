"""
Scrapes freeindex.co.uk UK business directory using httpx + BeautifulSoup.

Search URL pattern:
  https://www.freeindex.co.uk/searchresults.htm?k=<keyword>&l=<location>&v=a!b

The search results page contains business name, location, rating, and reviews.
Phone number and website are hidden behind JavaScript on the listing page, so
we fetch each business profile (JSON-LD) to retrieve those fields.
Profile URL pattern: /profile(<slug>)_<id>.htm
"""
import json
import logging
import re
import time
from decimal import Decimal, InvalidOperation

import httpx
from bs4 import BeautifulSoup

from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)

_BASE = "https://www.freeindex.co.uk"
_SEARCH_URL = f"{_BASE}/searchresults.htm"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Referer": _BASE + "/",
}
_PROFILE_DELAY = 0.15  # seconds between profile requests to avoid rate limiting


class FreeIndexProvider:
    source = "freeindex"

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        kw = keyword.strip().replace(" ", "_").lower()
        loc = location.strip().replace(" ", "_").lower()
        # Build URL manually — httpx would percent-encode '!' in v=a!b which breaks the server
        url = f"{_SEARCH_URL}?k={kw}&l={loc}&v=a!b"

        logger.info("FreeIndex: searching for '%s' in '%s'", keyword, location)
        try:
            resp = httpx.get(url, headers=_HEADERS, follow_redirects=True, timeout=20)
        except httpx.HTTPError as exc:
            raise LeadProviderError(f"FreeIndex request failed: {exc}") from exc

        if resp.status_code != 200:
            raise LeadProviderError(f"FreeIndex returned HTTP {resp.status_code}.")

        listings = _parse_search_results(resp.text, fallback_city=location)
        if not listings:
            logger.info("FreeIndex: no listings found")
            return []

        # Enrich each listing with phone + website from profile JSON-LD
        leads: list[ProviderLead] = []
        with httpx.Client(headers=_HEADERS, follow_redirects=True, timeout=15) as client:
            for i, (partial_lead, profile_url) in enumerate(listings):
                if i > 0:
                    time.sleep(_PROFILE_DELAY)
                phone, website = _fetch_profile_contact(client, profile_url)
                leads.append(ProviderLead(
                    name=partial_lead.name,
                    phone=phone,
                    website=website,
                    address=partial_lead.address,
                    city=partial_lead.city,
                    country="United Kingdom",
                    rating=partial_lead.rating,
                    review_count=partial_lead.review_count,
                    google_maps_url=profile_url,
                ))

        logger.info("FreeIndex: found %d leads for '%s' in '%s'", len(leads), keyword, location)
        return leads


def _parse_search_results(html: str, *, fallback_city: str) -> list[tuple[ProviderLead, str]]:
    """Returns list of (partial_lead, profile_url) tuples."""
    soup = BeautifulSoup(html, "lxml")
    cards = soup.select("div.listing")
    results = []
    for card in cards:
        item = _parse_listing_card(card, fallback_city=fallback_city)
        if item is not None:
            results.append(item)
    return results


def _parse_listing_card(card, *, fallback_city: str) -> tuple[ProviderLead, str] | None:
    # Name + profile URL
    name_el = card.select_one(".listing_name a[href^='/profile']")
    if name_el is None:
        return None
    name = name_el.get_text(strip=True)
    if not name:
        return None
    profile_path = str(name_el.get("href", ""))
    profile_url = f"{_BASE}{profile_path}" if profile_path else None
    if not profile_url:
        return None

    # Location — strip the "place" material-icon text
    city = fallback_city
    loc_el = card.select_one(".listing_locality")
    if loc_el:
        # Remove child elements (icon) and get remaining text
        for child in loc_el.find_all(True):
            child.extract()
        city = loc_el.get_text(strip=True) or fallback_city

    # Rating — from title attr: "Average rating of X.X based on N reviews"
    rating: Decimal | None = None
    rating_el = card.select_one(".ratinglarge")
    if rating_el:
        title = str(rating_el.get("title", ""))
        m = re.search(r"Average rating of ([\d.]+)", title)
        if m:
            rating = _safe_decimal(m.group(1))

    # Review count
    review_count = 0
    review_el = card.select_one(".listing_reviewcount, .badge.listing_reviewcount")
    if review_el:
        review_count = _parse_int(review_el.get_text(strip=True))

    partial = ProviderLead(
        name=name,
        city=city,
        country="United Kingdom",
        rating=rating,
        review_count=review_count,
    )
    return partial, profile_url


def _fetch_profile_contact(client: httpx.Client, profile_url: str) -> tuple[str | None, str | None]:
    """Fetch phone and website from a FreeIndex profile page via JSON-LD."""
    try:
        resp = client.get(profile_url)
        if resp.status_code != 200:
            return None, None
        soup = BeautifulSoup(resp.text, "lxml")

        # JSON-LD has telephone + optionally website
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
            except (json.JSONDecodeError, TypeError):
                continue
            phone = data.get("telephone") or None
            # Website: look for external links on the profile page
            website = _extract_website(soup)
            return phone, website

        # Fallback: tel: link
        phone_el = soup.select_one("a[href^='tel:']")
        phone = phone_el["href"][4:].strip() if phone_el else None
        website = _extract_website(soup)
        return phone, website

    except Exception as exc:
        logger.debug("FreeIndex profile fetch failed for %s: %s", profile_url, exc)
        return None, None


def _extract_website(soup: BeautifulSoup) -> str | None:
    """Find the first external non-FreeIndex link on a profile page."""
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        if (
            href.startswith("http")
            and "freeindex.co.uk" not in href.lower()
            and not href.startswith("https://www.google")
            and not href.startswith("https://maps")
        ):
            return href
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
