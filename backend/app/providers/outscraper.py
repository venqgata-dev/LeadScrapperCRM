import logging
from collections.abc import Iterable
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.core.config import Settings
from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)


class OutscraperProvider:
    source = "outscraper"

    def __init__(self, settings: Settings) -> None:
        self._api_key = settings.outscraper_api_key
        self._base_url = settings.outscraper_base_url
        self._limit = settings.outscraper_import_limit

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        if not self._api_key:
            raise LeadProviderError("OUTSCRAPER_API_KEY is not configured.")

        payload = self._fetch(keyword=keyword, location=location)
        raw_results = extract_result_dicts(payload)
        return [
            lead
            for raw_result in raw_results
            if (lead := normalize_outscraper_lead(raw_result, fallback_city=location))
            is not None
        ]

    def _fetch(self, *, keyword: str, location: str) -> Any:
        url = f"{self._base_url.rstrip('/')}/maps/search-v3"
        params = {
            "query": f"{keyword.strip()} in {location.strip()}, UK",
            "async": "false",
            "limit": self._limit,
        }
        headers = {"X-API-KEY": self._api_key or ""}

        try:
            with httpx.Client(timeout=60) as client:
                response = client.get(url, params=params, headers=headers)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise LeadProviderError(
                f"Outscraper returned HTTP {exc.response.status_code}."
            ) from exc
        except httpx.HTTPError as exc:
            raise LeadProviderError("Unable to connect to Outscraper.") from exc

        payload = response.json()
        status = payload.get("status") if isinstance(payload, dict) else None
        if status and str(status).lower() not in {"success", "completed", "ok"}:
            logger.warning("Unexpected Outscraper status: %s", status)
        return payload


def normalize_outscraper_lead(
    raw_result: dict[str, Any],
    *,
    fallback_city: str,
) -> ProviderLead | None:
    name = first_text(raw_result, "business_name", "name", "title")
    if not name:
        return None

    return ProviderLead(
        name=name,
        phone=first_text(raw_result, "phone", "phone_number", "site_phone"),
        website=first_text(raw_result, "website", "site", "website_url"),
        address=first_text(raw_result, "address", "full_address", "formatted_address"),
        city=first_text(raw_result, "city", "municipality") or fallback_city,
        category=first_text(raw_result, "category", "type", "business_category"),
        rating=parse_decimal(first_value(raw_result, "rating", "reviews_rating")),
        review_count=parse_int(first_value(raw_result, "review_count", "reviews", "reviews_count")),
        google_maps_url=first_text(raw_result, "google_maps_url", "location_link", "place_link"),
        email=first_email(raw_result),
        facebook_url=first_text(raw_result, "facebook_url", "facebook"),
        instagram_url=first_text(raw_result, "instagram_url", "instagram"),
        linkedin_url=first_text(raw_result, "linkedin_url", "linkedin"),
    )


def extract_result_dicts(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and "data" in payload:
        return extract_result_dicts(payload["data"])

    if isinstance(payload, dict):
        return [payload]

    if isinstance(payload, list):
        results: list[dict[str, Any]] = []
        for item in payload:
            results.extend(extract_result_dicts(item))
        return results

    return []


def first_value(raw_result: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = raw_result.get(key)
        if value not in (None, ""):
            return value
    return None


def first_text(raw_result: dict[str, Any], *keys: str) -> str | None:
    value = first_value(raw_result, *keys)
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return str(value)


def first_email(raw_result: dict[str, Any]) -> str | None:
    direct_email = first_text(raw_result, "email", "email_1", "business_email")
    if direct_email:
        return direct_email

    emails = raw_result.get("emails")
    if isinstance(emails, str):
        return emails.strip() or None
    if isinstance(emails, Iterable):
        for email in emails:
            if isinstance(email, str) and email.strip():
                return email.strip()

    return None


def parse_decimal(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def parse_int(value: Any) -> int:
    if value in (None, ""):
        return 0
    if isinstance(value, str):
        value = value.replace(",", "")
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
