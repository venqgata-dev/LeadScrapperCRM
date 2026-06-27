import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.business import LeadImportResponse
from app.services.csv_parser import read_csv_upload, parse_csv_rows
from app.services.imports import find_existing_business, build_business, update_business

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/import-csv", response_model=LeadImportResponse)
async def import_csv(
    file: UploadFile,
    db: Annotated[Session, Depends(get_db)],
) -> LeadImportResponse:
    text = await read_csv_upload(file)
    rows = parse_csv_rows(text)

    imported = updated = skipped = 0
    try:
        for lead, classified in rows:
            existing = find_existing_business(db, lead)
            if existing is None:
                db.add(build_business(classified))
                imported += 1
            else:
                update_business(existing, classified)
                updated += 1

        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error during CSV import")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is temporarily unavailable.",
        ) from exc

    # parse_csv_rows already deduplicates; count excess as skipped
    skipped = 0
    return LeadImportResponse(imported=imported, updated=updated, skipped=skipped)
