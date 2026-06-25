import logging
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.enums import ContactStatus, WebsiteStatus
from app.db.session import get_db
from app.schemas.business import (
    BusinessNoteCreate,
    BusinessNoteRead,
    BusinessRead,
    BusinessUpdate,
    CallLogCreate,
    CallLogRead,
    CategoryAnalytics,
    CrmDashboardStats,
    MarketAnalytics,
    RevenueByMonth,
)
from app.services.businesses import (
    create_call_log,
    create_note,
    get_business,
    get_category_analytics,
    get_dashboard_stats,
    get_market_analytics,
    get_opportunities,
    get_revenue_by_month,
    list_businesses,
    list_call_logs,
    list_notes,
    update_business,
)
from app.services.email_discovery import discover_email

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/analytics/revenue-by-month", response_model=list[RevenueByMonth])
def get_revenue_months(db: Annotated[Session, Depends(get_db)]) -> list[RevenueByMonth]:
    try:
        return get_revenue_by_month(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get revenue by month")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/analytics/categories", response_model=list[CategoryAnalytics])
def get_categories(db: Annotated[Session, Depends(get_db)]) -> list[CategoryAnalytics]:
    try:
        return get_category_analytics(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get category analytics")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/analytics/markets", response_model=list[MarketAnalytics])
def get_markets(db: Annotated[Session, Depends(get_db)]) -> list[MarketAnalytics]:
    try:
        return get_market_analytics(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get market analytics")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/stats", response_model=CrmDashboardStats)
def get_stats(db: Annotated[Session, Depends(get_db)]) -> CrmDashboardStats:
    try:
        return get_dashboard_stats(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get dashboard stats")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/opportunities/no-website", response_model=list[BusinessRead])
def get_no_website_opportunities(db: Annotated[Session, Depends(get_db)]) -> list[BusinessRead]:
    try:
        return get_opportunities(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get opportunities")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("", response_model=list[BusinessRead])
def get_businesses(
    db: Annotated[Session, Depends(get_db)],
    has_phone: Annotated[bool | None, Query()] = None,
    has_email: Annotated[bool | None, Query()] = None,
    website_status: Annotated[WebsiteStatus | None, Query()] = None,
    minimum_reviews: Annotated[int | None, Query(ge=0)] = None,
    minimum_rating: Annotated[Decimal | None, Query(ge=0, le=5)] = None,
    city: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
    country: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
    contact_status: Annotated[ContactStatus | None, Query()] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
) -> list[BusinessRead]:
    try:
        return list_businesses(
            db,
            has_phone=has_phone,
            has_email=has_email,
            website_status=website_status,
            minimum_reviews=minimum_reviews,
            minimum_rating=minimum_rating,
            city=city,
            country=country,
            category=category,
            contact_status=contact_status,
            search=search,
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to list businesses")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/{business_id}", response_model=BusinessRead)
def get_business_by_id(business_id: int, db: Annotated[Session, Depends(get_db)]) -> BusinessRead:
    try:
        business = get_business(db, business_id)
    except SQLAlchemyError as exc:
        logger.exception("Failed to get business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc
    if business is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
    return BusinessRead.model_validate(business)


@router.patch("/{business_id}", response_model=BusinessRead)
def patch_business(
    business_id: int,
    payload: BusinessUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRead:
    try:
        business = get_business(db, business_id)
        if business is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
        updated = update_business(db, business, payload)
        return BusinessRead.model_validate(updated)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to update business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


# ---------------------------------------------------------------------------
# Call logs
# ---------------------------------------------------------------------------

@router.post("/{business_id}/calls", response_model=CallLogRead, status_code=status.HTTP_201_CREATED)
def log_call(
    business_id: int,
    payload: CallLogCreate,
    db: Annotated[Session, Depends(get_db)],
) -> CallLogRead:
    try:
        business = get_business(db, business_id)
        if business is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
        log = create_call_log(db, business, payload)
        return CallLogRead.model_validate(log)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to log call for business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/{business_id}/calls", response_model=list[CallLogRead])
def get_calls(business_id: int, db: Annotated[Session, Depends(get_db)]) -> list[CallLogRead]:
    try:
        return list_call_logs(db, business_id)
    except SQLAlchemyError as exc:
        logger.exception("Failed to list calls for business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


# ---------------------------------------------------------------------------
# Notes history
# ---------------------------------------------------------------------------

@router.post("/{business_id}/notes", response_model=BusinessNoteRead, status_code=status.HTTP_201_CREATED)
def add_note(
    business_id: int,
    payload: BusinessNoteCreate,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessNoteRead:
    try:
        business = get_business(db, business_id)
        if business is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
        note = create_note(db, business, payload)
        return BusinessNoteRead.model_validate(note)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to add note for business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


@router.get("/{business_id}/notes", response_model=list[BusinessNoteRead])
def get_notes(business_id: int, db: Annotated[Session, Depends(get_db)]) -> list[BusinessNoteRead]:
    try:
        return list_notes(db, business_id)
    except SQLAlchemyError as exc:
        logger.exception("Failed to list notes for business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc


# ---------------------------------------------------------------------------
# Email discovery
# ---------------------------------------------------------------------------

@router.post("/{business_id}/discover-email", response_model=BusinessRead)
def discover_email_for_business(
    business_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRead:
    """Scrape the business website for a contact email and persist it."""
    try:
        business = get_business(db, business_id)
        if business is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
        if not business.website:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Business has no website to scan.",
            )
        email, source = discover_email(business.website)
        if email:
            payload = BusinessUpdate(email=email, email_source=source)
            business = update_business(db, business, payload)
        return BusinessRead.model_validate(business)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to discover email for business %d", business_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is temporarily unavailable.") from exc
