"""Shared CSV parsing logic used by both /preview-csv and /import-csv."""
from __future__ import annotations

import csv
import io
import logging

from fastapi import HTTPException, UploadFile, status

from app.providers.base import ProviderLead
from app.services.imports import classify_lead, normalize_phone, ClassifiedLead

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"name"}
ALLOWED_COLUMNS = {
    "name", "phone", "email", "website", "address",
    "city", "country", "category", "rating", "review_count",
    "google_maps_url", "facebook_url", "instagram_url", "linkedin_url",
}


def _parse_rating(val: str) -> float | None:
    try:
        return float(val) if val else None
    except ValueError:
        return None


def _parse_review_count(val: str) -> int:
    try:
        return int(val) if val else 0
    except ValueError:
        return 0


async def read_csv_upload(file: UploadFile) -> str:
    """Validate content type and read the file contents as a string."""
    if file.content_type not in (
        "text/csv", "application/csv", "application/octet-stream", "text/plain",
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be a CSV.",
        )
    try:
        contents = await file.read()
        return contents.decode("utf-8-sig")  # handle BOM
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read file.",
        ) from exc


def parse_csv_rows(text: str) -> list[tuple[ProviderLead, ClassifiedLead]]:
    """
    Parse CSV text into (ProviderLead, ClassifiedLead) pairs, deduplicating
    within the file. Raises HTTPException on structural issues.

    Returns rows sorted by lead_score descending.
    """
    try:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV has no headers.",
            )

        headers = {h.strip().lower() for h in reader.fieldnames}
        if not REQUIRED_COLUMNS.issubset(headers):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"CSV must contain columns: {', '.join(REQUIRED_COLUMNS)}",
            )

        seen_keys: set[tuple[str, str]] = set()
        rows: list[tuple[ProviderLead, ClassifiedLead]] = []

        for row in reader:
            normalized = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
            name = normalized.get("name", "").strip()
            if not name:
                continue

            lead = ProviderLead(
                name=name,
                phone=normalized.get("phone") or None,
                email=normalized.get("email") or None,
                website=normalized.get("website") or None,
                address=normalized.get("address") or None,
                city=normalized.get("city") or None,
                country=normalized.get("country") or None,
                category=normalized.get("category") or None,
                rating=_parse_rating(normalized.get("rating", "")),
                review_count=_parse_review_count(normalized.get("review_count", "")),
                google_maps_url=normalized.get("google_maps_url") or None,
                facebook_url=normalized.get("facebook_url") or None,
                instagram_url=normalized.get("instagram_url") or None,
                linkedin_url=normalized.get("linkedin_url") or None,
            )
            classified = classify_lead(lead)

            # Deduplicate within the file
            norm_phone = normalize_phone(lead.phone)
            batch_key: tuple[str, str] = (
                ("phone", norm_phone) if norm_phone else ("name", name.casefold())
            )
            if batch_key in seen_keys:
                continue
            seen_keys.add(batch_key)

            rows.append((lead, classified))

        rows.sort(key=lambda r: r[1].lead_score, reverse=True)
        return rows

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error parsing CSV")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV: {exc}",
        ) from exc
