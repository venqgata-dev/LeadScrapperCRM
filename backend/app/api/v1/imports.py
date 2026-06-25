import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.providers.base import LeadProviderError, LeadProviderNotImplementedError
from app.schemas.business import LeadImportRequest, LeadImportResponse
from app.services.imports import import_leads

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/import-leads", response_model=LeadImportResponse)
def import_provider_leads(
    payload: LeadImportRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LeadImportResponse:
    try:
        return import_leads(
            db,
            source=payload.source,
            keyword=payload.keyword,
            location=payload.location,
        )
    except LeadProviderNotImplementedError as exc:
        logger.info("Lead provider is not implemented: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc
    except LeadProviderError as exc:
        logger.warning("Lead import failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        logger.exception("Failed to persist Outscraper import")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is temporarily unavailable.",
        ) from exc


@router.post("/import-outscraper", response_model=LeadImportResponse)
def import_outscraper(
    payload: LeadImportRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LeadImportResponse:
    return import_provider_leads(payload=payload, db=db)
