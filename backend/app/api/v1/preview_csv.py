"""
POST /preview-csv

Parses a CSV upload, classifies each row, and returns SearchResultLeads
WITHOUT writing anything to the database.  The caller decides what to save
via POST /import-batch.
"""
import csv
import io
import logging

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.providers.base import ProviderLead
from app.schemas.business import SearchResultLead
from app.services.imports import classify_lead

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/preview-csv", response_model=list[SearchResultLead])
async def preview_csv(file: UploadFile) -> list[SearchResultLead]:
    if file.content_type not in (
        "text/csv", "application/csv", "application/octet-stream", "text/plain",
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be a CSV.",
        )

    try:
        contents = await file.read()
        text = contents.decode("utf-8-sig")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read file.",
        ) from exc

    try:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV has no headers.",
            )

        headers = {h.strip().lower() for h in reader.fieldnames}
        if "name" not in headers:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="CSV must contain a 'name' column.",
            )

        seen_keys: set[tuple[str, str]] = set()
        results: list[SearchResultLead] = []

        for row in reader:
            normalized = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
            name = normalized.get("name", "").strip()
            if not name:
                continue

            def _rating() -> float | None:
                val = normalized.get("rating", "")
                try:
                    return float(val) if val else None
                except ValueError:
                    return None

            def _review_count() -> int:
                val = normalized.get("review_count", "")
                try:
                    return int(val) if val else 0
                except ValueError:
                    return 0

            lead = ProviderLead(
                name=name,
                phone=normalized.get("phone") or None,
                email=normalized.get("email") or None,
                website=normalized.get("website") or None,
                address=normalized.get("address") or None,
                city=normalized.get("city") or None,
                country=normalized.get("country") or None,
                category=normalized.get("category") or None,
                rating=_rating(),
                review_count=_review_count(),
                google_maps_url=normalized.get("google_maps_url") or None,
                facebook_url=normalized.get("facebook_url") or None,
                instagram_url=normalized.get("instagram_url") or None,
                linkedin_url=normalized.get("linkedin_url") or None,
            )

            classified = classify_lead(lead)

            # deduplicate within the file
            from app.services.imports import normalize_phone
            norm_phone = normalize_phone(lead.phone)
            batch_key: tuple[str, str] = (
                ("phone", norm_phone) if norm_phone else ("name", name.casefold())
            )
            if batch_key in seen_keys:
                continue
            seen_keys.add(batch_key)

            results.append(
                SearchResultLead(
                    name=lead.name,
                    phone=lead.phone,
                    email=lead.email,
                    website=lead.website,
                    website_status=classified.website_status,
                    address=lead.address,
                    city=lead.city,
                    country=lead.country,
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

        # Sort: highest lead score first
        results.sort(key=lambda r: r.lead_score, reverse=True)
        return results

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error parsing CSV preview")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV: {exc}",
        ) from exc
