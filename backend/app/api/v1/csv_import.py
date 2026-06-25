import csv
import io
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.providers.base import ProviderLead
from app.schemas.business import LeadImportResponse
from app.services.imports import classify_lead, find_existing_business, build_business, update_business

logger = logging.getLogger(__name__)

router = APIRouter()

REQUIRED_COLUMNS = {"name"}
ALLOWED_COLUMNS = {
    "name", "phone", "email", "website", "address",
    "city", "country", "category", "rating", "review_count",
    "google_maps_url", "facebook_url", "instagram_url", "linkedin_url",
}


@router.post("/import-csv", response_model=LeadImportResponse)
async def import_csv(
    file: UploadFile,
    db: Annotated[Session, Depends(get_db)],
) -> LeadImportResponse:
    if file.content_type not in ("text/csv", "application/csv", "application/octet-stream", "text/plain"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be a CSV.",
        )

    try:
        contents = await file.read()
        text = contents.decode("utf-8-sig")  # handle BOM
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read file.",
        ) from exc

    try:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV has no headers.")

        headers = {h.strip().lower() for h in reader.fieldnames}
        if not REQUIRED_COLUMNS.issubset(headers):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"CSV must contain columns: {', '.join(REQUIRED_COLUMNS)}",
            )

        imported = 0
        updated = 0
        skipped = 0
        seen_keys: set[tuple[str, str]] = set()

        for row in reader:
            normalized = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            name = normalized.get("name", "").strip()
            if not name:
                skipped += 1
                continue

            def _rating():
                val = normalized.get("rating", "")
                try:
                    return float(val) if val else None
                except ValueError:
                    return None

            def _review_count():
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
            batch_key = classified.dedupe_key
            if batch_key in seen_keys:
                skipped += 1
                continue
            seen_keys.add(batch_key)

            existing = find_existing_business(db, lead)
            if existing is None:
                db.add(build_business(classified))
                imported += 1
            else:
                update_business(existing, classified)
                updated += 1

        db.commit()
        return LeadImportResponse(imported=imported, updated=updated, skipped=skipped)

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error during CSV import")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is temporarily unavailable.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during CSV import")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV: {exc}",
        ) from exc
