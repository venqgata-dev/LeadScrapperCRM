import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.providers.base import LeadProviderError, LeadProviderNotImplementedError
from app.schemas.business import BatchImportRequest, LeadImportResponse, SearchRequest, SearchResponse
from app.services.imports import batch_import_leads, search_leads

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search_for_leads(payload: SearchRequest) -> SearchResponse:
    """
    Search a provider and return classified results with analytics.
    Supports neighbor expansion and keyword expansion.
    The caller can then choose which results to import via POST /import-batch.
    """
    try:
        return search_leads(
            source=payload.provider,
            keyword=payload.category,
            location=f"{payload.city}, {payload.country}",
            country=payload.country,
            radius_km=payload.radius_km,
            expand_neighbors=payload.expand_neighbors,
            use_keyword_expansion=payload.expand_keywords,
        )
    except LeadProviderNotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc
    except LeadProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/import-batch", response_model=LeadImportResponse)
def import_batch(
    payload: BatchImportRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LeadImportResponse:
    """Persist a caller-selected subset of SearchResultLeads."""
    if not payload.leads:
        return LeadImportResponse(imported=0, updated=0, skipped=0)
    try:
        return batch_import_leads(db, payload.leads)
    except SQLAlchemyError as exc:
        logger.exception("Database error during batch import")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is temporarily unavailable.",
        ) from exc
