"""
Google Maps Places API (New) provider.

Uses the Places Text Search endpoint — free tier gives $200/month credit
which covers roughly 1,000–2,000 text searches.

Requires GOOGLE_MAPS_API_KEY in environment.

API docs: https://developers.google.com/maps/documentation/places/web-service/text-search
"""
import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.core.config import Settings
from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)

_PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.addressComponents",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.primaryTypeDisplayName",
    "places.types",
])


class GoogleMapsProvider:
    source = "google_maps"

    def __init__(self, settings: Settings) -> None:
        self._api_key = settings.google_maps_api_key
        self._limit = settings.google_maps_import_limit

    def search(self, keyword: str, location: str, radius_km: int = 0) -> list[ProviderLead]:
        if not self._api_key:
            raise LeadProviderError(
                "GOOGLE_MAPS_API_KEY is not configured. "
                "Add it to your .env file to use the Google Maps provider."
            )

        # Places API (New) locationBias circle is capped at 50,000 m (50 km).
        _RADIUS_MAX_M = 50_000
        location_bias: dict[str, Any] | None = None
        if radius_km > 0:
            coords = self._geocode(location)
            if coords:
                lat, lng = coords
                radius_m = min(float(radius_km * 1000), _RADIUS_MAX_M)
                location_bias = {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": radius_m,
                    }
                }
                logger.info(
                    "GoogleMaps: using radius %.0f m (requested %d km) around %.4f, %.4f",
                    radius_m, radius_km, lat, lng,
                )

        raw_results = self._fetch_all(keyword=keyword, location=location, location_bias=location_bias)
        leads = [
            lead
            for raw in raw_results
            if (lead := _normalize(raw, fallback_city=location)) is not None
        ]
        logger.info(
            "GoogleMaps '%s' in '%s': %d raw → %d normalized (radius=%d km)",
            keyword, location, len(raw_results), len(leads), radius_km,
        )
        return leads

    def _geocode(self, location: str) -> tuple[float, float] | None:
        """Return (lat, lng) for a location string using the Geocoding API."""
        try:
            resp = httpx.get(
                _GEOCODE_URL,
                params={"address": location, "key": self._api_key or ""},
                timeout=10,
            )
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return float(loc["lat"]), float(loc["lng"])
        except Exception as exc:
            logger.warning("GoogleMaps: geocoding failed for %r — %s", location, exc)
        return None

    def _fetch_all(self, *, keyword: str, location: str, location_bias: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Fetches results, following nextPageToken until limit is reached."""
        all_results: list[dict[str, Any]] = []
        page_token: str | None = None

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self._api_key or "",
            "X-Goog-FieldMask": _FIELD_MASK + ",nextPageToken",
        }

        page_num = 0
        with httpx.Client(timeout=30) as client:
            while len(all_results) < self._limit:
                body: dict[str, Any] = {
                    "textQuery": f"{keyword.strip()} in {location.strip()}",
                    "maxResultCount": min(20, self._limit - len(all_results)),
                    "languageCode": "en",
                }
                if location_bias:
                    body["locationBias"] = location_bias
                if page_token:
                    body["pageToken"] = page_token

                try:
                    response = client.post(_PLACES_URL, json=body, headers=headers)
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    _handle_http_error(exc)
                except httpx.HTTPError as exc:
                    raise LeadProviderError("Unable to connect to Google Maps API.") from exc

                data = response.json()
                places = data.get("places", [])
                page_num += 1
                logger.debug(
                    "GoogleMaps page %d: %d places (total so far: %d)",
                    page_num, len(places), len(all_results) + len(places),
                )
                all_results.extend(places)

                page_token = data.get("nextPageToken")
                if not page_token or not places:
                    break

        return all_results


def _handle_http_error(exc: httpx.HTTPStatusError) -> None:
    status = exc.response.status_code
    try:
        detail = exc.response.json().get("error", {}).get("message", "")
    except Exception:
        detail = exc.response.text[:200]

    if status == 403:
        raise LeadProviderError(
            f"Google Maps API key is invalid or missing permissions. {detail}"
        ) from exc
    if status == 429:
        raise LeadProviderError("Google Maps API quota exceeded.") from exc
    raise LeadProviderError(f"Google Maps returned HTTP {status}. {detail}") from exc


def _normalize(place: dict[str, Any], *, fallback_city: str) -> ProviderLead | None:
    name_data = place.get("displayName", {})
    name = name_data.get("text", "").strip() if isinstance(name_data, dict) else ""
    if not name:
        return None

    phone = place.get("nationalPhoneNumber") or None
    website = place.get("websiteUri") or None
    google_maps_url = place.get("googleMapsUri") or None
    rating_raw = place.get("rating")
    rating = _safe_decimal(rating_raw)
    review_count = _parse_int(place.get("userRatingCount", 0))

    address = place.get("formattedAddress") or None
    city = _extract_city(place.get("addressComponents", []), fallback_city)
    country = _extract_country(place.get("addressComponents", []))

    category_data = place.get("primaryTypeDisplayName", {})
    category = category_data.get("text") if isinstance(category_data, dict) else None

    return ProviderLead(
        name=name,
        phone=phone,
        website=website,
        address=address,
        city=city,
        country=country,
        category=category,
        rating=rating,
        review_count=review_count,
        google_maps_url=google_maps_url,
    )


def _extract_city(components: list[dict[str, Any]], fallback: str) -> str:
    for comp in components:
        types = comp.get("types", [])
        if "locality" in types or "postal_town" in types:
            return comp.get("longText", fallback)
    return fallback


def _extract_country(components: list[dict[str, Any]]) -> str | None:
    for comp in components:
        if "country" in comp.get("types", []):
            return comp.get("longText") or None
    return None


def _safe_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _parse_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
