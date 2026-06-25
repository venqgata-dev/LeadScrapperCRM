from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.enums import ContactStatus, WebsiteStatus
from app.models.business import Business, BusinessNote, CallLog
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


def calculate_lead_score(
    website_status: WebsiteStatus | str,
    review_count: int,
    rating: Decimal | float | None,
    phone: str | None = None,
    email: str | None = None,
) -> int:
    score = website_status_score(website_status)

    if phone and phone.strip():
        score += 20
    if email and email.strip():
        score += 20

    if review_count > 50:
        score += 30
    elif review_count > 25:
        score += 20
    elif review_count > 10:
        score += 10

    if rating is not None and Decimal(str(rating)) > Decimal("4.5"):
        score += 20

    return score


def website_status_score(website_status: WebsiteStatus | str) -> int:
    normalized_status = (
        website_status.value if isinstance(website_status, WebsiteStatus) else website_status
    )
    scores = {
        WebsiteStatus.NO_WEBSITE.value: 100,
        WebsiteStatus.FACEBOOK_ONLY.value: 80,
        WebsiteStatus.FREE_BUILDER.value: 50,
    }
    return scores.get(normalized_status, 0)


def lead_score_expression() -> ColumnElement[int]:
    phone_present = and_(
        Business.phone.is_not(None),
        func.length(func.trim(Business.phone)) > 0,
    )
    email_present = and_(
        Business.email.is_not(None),
        func.length(func.trim(Business.email)) > 0,
    )
    return (
        case(
            (Business.website_status == WebsiteStatus.NO_WEBSITE.value, 100),
            (Business.website_status == WebsiteStatus.FACEBOOK_ONLY.value, 80),
            (Business.website_status == WebsiteStatus.FREE_BUILDER.value, 50),
            else_=0,
        )
        + case((phone_present, 20), else_=0)
        + case((email_present, 20), else_=0)
        + case(
            (Business.review_count > 50, 30),
            (Business.review_count > 25, 20),
            (Business.review_count > 10, 10),
            else_=0,
        )
        + case(
            (Business.rating > Decimal("4.5"), 20),
            else_=0,
        )
    )


def list_businesses(
    db: Session,
    *,
    has_phone: bool | None = None,
    has_email: bool | None = None,
    website_status: WebsiteStatus | None = None,
    minimum_reviews: int | None = None,
    minimum_rating: Decimal | None = None,
    city: str | None = None,
    country: str | None = None,
    category: str | None = None,
    search: str | None = None,
    contact_status: ContactStatus | None = None,
) -> list[BusinessRead]:
    calculated_lead_score = lead_score_expression().label("calculated_lead_score")
    statement = select(Business, calculated_lead_score)

    filters: list[ColumnElement[bool]] = []
    if has_phone is not None:
        phone_present = and_(
            Business.phone.is_not(None),
            func.length(func.trim(Business.phone)) > 0,
        )
        filters.append(phone_present if has_phone else or_(Business.phone.is_(None), ~phone_present))

    if has_email is not None:
        email_present = and_(
            Business.email.is_not(None),
            func.length(func.trim(Business.email)) > 0,
        )
        filters.append(email_present if has_email else or_(Business.email.is_(None), ~email_present))

    if website_status is not None:
        filters.append(Business.website_status == website_status.value)

    if minimum_reviews is not None:
        filters.append(Business.review_count >= minimum_reviews)

    if minimum_rating is not None:
        filters.append(Business.rating >= minimum_rating)

    if city is not None:
        filters.append(Business.city.ilike(f"%{city.strip()}%"))

    if country is not None:
        filters.append(Business.country.ilike(f"%{country.strip()}%"))

    if category is not None:
        filters.append(Business.category.ilike(f"%{category.strip()}%"))

    if contact_status is not None:
        filters.append(Business.contact_status == contact_status.value)

    if search is not None:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Business.name.ilike(term),
                Business.phone.ilike(term),
                Business.city.ilike(term),
            )
        )

    if filters:
        statement = statement.where(*filters)

    statement = statement.order_by(
        calculated_lead_score.desc(),
        Business.review_count.desc(),
        Business.rating.desc().nullslast(),
        Business.name.asc(),
    )

    rows = db.execute(statement).all()
    return [
        BusinessRead.model_validate(business).model_copy(
            update={"lead_score": int(score or 0)}
        )
        for business, score in rows
    ]


def get_business(db: Session, business_id: int) -> Business | None:
    return db.get(Business, business_id)


def update_business(db: Session, business: Business, payload: BusinessUpdate) -> Business:
    if payload.notes is not None:
        business.notes = payload.notes
    if payload.contact_status is not None:
        old_status = business.contact_status
        new_status = payload.contact_status.value
        business.contact_status = new_status

        now = datetime.now(UTC)
        # Track key transition timestamps
        if new_status in ("CALLED",) and old_status == "NEW":
            if business.called_at is None:
                business.called_at = now
        if new_status == "PROPOSAL_SENT" and business.proposal_sent_at is None:
            business.proposal_sent_at = now
        if new_status == "WON" and business.won_at is None:
            business.won_at = now

    if payload.deal_value is not None:
        business.deal_value = payload.deal_value
    if payload.follow_up_date is not None:
        business.follow_up_date = payload.follow_up_date
    if payload.proposal_sent_at is not None:
        business.proposal_sent_at = payload.proposal_sent_at
    if payload.called_at is not None:
        business.called_at = payload.called_at
    if payload.won_at is not None:
        business.won_at = payload.won_at
    if payload.email is not None:
        business.email = payload.email
    if payload.email_source is not None:
        business.email_source = payload.email_source

    db.commit()
    db.refresh(business)
    return business


def get_opportunities(db: Session) -> list[BusinessRead]:
    calculated_lead_score = lead_score_expression().label("calculated_lead_score")
    statement = (
        select(Business, calculated_lead_score)
        .where(
            Business.website_status == WebsiteStatus.NO_WEBSITE.value,
            Business.phone.is_not(None),
            func.length(func.trim(Business.phone)) > 0,
        )
        .order_by(
            calculated_lead_score.desc(),
            Business.review_count.desc(),
        )
    )
    rows = db.execute(statement).all()
    return [
        BusinessRead.model_validate(business).model_copy(
            update={"lead_score": int(score or 0)}
        )
        for business, score in rows
    ]


def get_dashboard_stats(db: Session) -> CrmDashboardStats:
    no_website = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.website_status == WebsiteStatus.NO_WEBSITE.value)
    ) or 0
    facebook_only = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.website_status == WebsiteStatus.FACEBOOK_ONLY.value)
    ) or 0
    free_builder = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.website_status == WebsiteStatus.FREE_BUILDER.value)
    ) or 0

    total_calls = db.scalar(
        select(func.count()).select_from(CallLog)
    ) or 0

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    calls_today = db.scalar(
        select(func.count()).select_from(CallLog)
        .where(CallLog.called_at >= today_start)
    ) or 0

    interested = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.contact_status == ContactStatus.INTERESTED.value)
    ) or 0

    proposals_sent = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.contact_status == ContactStatus.PROPOSAL_SENT.value)
    ) or 0

    deals_won = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.contact_status == ContactStatus.WON.value)
    ) or 0

    revenue_won = db.scalar(
        select(func.coalesce(func.sum(Business.deal_value), 0))
        .where(Business.contact_status == ContactStatus.WON.value)
    ) or Decimal("0")

    avg_deal_value = db.scalar(
        select(func.coalesce(func.avg(Business.deal_value), 0))
        .where(
            Business.contact_status == ContactStatus.WON.value,
            Business.deal_value.is_not(None),
        )
    ) or Decimal("0")

    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    revenue_this_month = db.scalar(
        select(func.coalesce(func.sum(Business.deal_value), 0))
        .where(
            Business.contact_status == ContactStatus.WON.value,
            Business.won_at >= month_start,
        )
    ) or Decimal("0")

    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    revenue_last_30_days = db.scalar(
        select(func.coalesce(func.sum(Business.deal_value), 0))
        .where(
            Business.contact_status == ContactStatus.WON.value,
            Business.won_at >= thirty_days_ago,
        )
    ) or Decimal("0")

    # Conversion funnel rates
    contacted = db.scalar(
        select(func.count()).select_from(Business)
        .where(Business.contact_status != "NEW")
    ) or 0
    call_to_interested_rate = round(interested / contacted * 100) if contacted else 0
    interested_to_proposal_rate = round(proposals_sent / interested * 100) if interested else 0
    proposal_to_won_rate = round(deals_won / proposals_sent * 100) if proposals_sent else 0

    return CrmDashboardStats(
        total_opportunities=no_website + facebook_only + free_builder,
        no_website=no_website,
        facebook_only=facebook_only,
        free_builder=free_builder,
        total_calls=total_calls,
        calls_today=calls_today,
        interested=interested,
        proposals_sent=proposals_sent,
        deals_won=deals_won,
        revenue_won=Decimal(str(revenue_won)),
        avg_deal_value=Decimal(str(avg_deal_value)).quantize(Decimal("0.01")),
        revenue_this_month=Decimal(str(revenue_this_month)),
        revenue_last_30_days=Decimal(str(revenue_last_30_days)),
        call_to_interested_rate=call_to_interested_rate,
        interested_to_proposal_rate=interested_to_proposal_rate,
        proposal_to_won_rate=proposal_to_won_rate,
    )


# ---------------------------------------------------------------------------
# Call log helpers
# ---------------------------------------------------------------------------

def create_call_log(db: Session, business: Business, payload: CallLogCreate) -> CallLog:
    called_at = payload.called_at or datetime.now(UTC)
    log = CallLog(
        business_id=business.id,
        called_at=called_at,
        outcome=payload.outcome.value if payload.outcome else None,
        notes=payload.notes,
    )
    db.add(log)
    # Update business.called_at to the most-recent call
    if business.called_at is None or called_at > business.called_at:
        business.called_at = called_at
    # Auto-advance status NEW → CALLED on first call
    if business.contact_status == "NEW":
        if payload.outcome and payload.outcome.value == "NO_ANSWER":
            business.contact_status = "NO_ANSWER"
        else:
            business.contact_status = "CALLED"
    db.commit()
    db.refresh(log)
    return log


def list_call_logs(db: Session, business_id: int) -> list[CallLogRead]:
    rows = db.scalars(
        select(CallLog).where(CallLog.business_id == business_id)
        .order_by(CallLog.called_at.desc())
    ).all()
    return [CallLogRead.model_validate(r) for r in rows]


# ---------------------------------------------------------------------------
# Note history helpers
# ---------------------------------------------------------------------------

def create_note(db: Session, business: Business, payload: BusinessNoteCreate) -> BusinessNote:
    note = BusinessNote(business_id=business.id, body=payload.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def list_notes(db: Session, business_id: int) -> list[BusinessNoteRead]:
    rows = db.scalars(
        select(BusinessNote).where(BusinessNote.business_id == business_id)
        .order_by(BusinessNote.created_at.desc())
    ).all()
    return [BusinessNoteRead.model_validate(r) for r in rows]


# ---------------------------------------------------------------------------
# Sales intelligence analytics
# ---------------------------------------------------------------------------

_OPP_STATUSES = (
    WebsiteStatus.NO_WEBSITE.value,
    WebsiteStatus.FACEBOOK_ONLY.value,
    WebsiteStatus.FREE_BUILDER.value,
)


def get_category_analytics(db: Session) -> list[CategoryAnalytics]:
    rows = db.execute(
        select(
            Business.category,
            func.count(
                case((Business.website_status.in_(_OPP_STATUSES), 1))
            ).label("opportunities"),
            func.count(
                case((Business.contact_status == ContactStatus.WON.value, 1))
            ).label("won_deals"),
            func.coalesce(
                func.sum(
                    case((Business.contact_status == ContactStatus.WON.value, Business.deal_value))
                ),
                0,
            ).label("revenue"),
        )
        .where(Business.category.is_not(None))
        .group_by(Business.category)
        .order_by(func.count(
            case((Business.website_status.in_(_OPP_STATUSES), 1))
        ).desc())
    ).all()
    return [
        CategoryAnalytics(
            category=row.category,
            opportunities=row.opportunities,
            won_deals=row.won_deals,
            revenue=Decimal(str(row.revenue)),
        )
        for row in rows
        if row.category
    ]


def get_market_analytics(db: Session) -> list[MarketAnalytics]:
    rows = db.execute(
        select(
            Business.city,
            func.count().label("total"),
            func.count(
                case((Business.website_status.in_(_OPP_STATUSES), 1))
            ).label("opportunities"),
            func.coalesce(
                func.sum(
                    case((Business.contact_status == ContactStatus.WON.value, Business.deal_value))
                ),
                0,
            ).label("revenue_won"),
        )
        .where(Business.city.is_not(None))
        .group_by(Business.city)
        .order_by(func.count(
            case((Business.website_status.in_(_OPP_STATUSES), 1))
        ).desc())
    ).all()
    return [
        MarketAnalytics(
            city=row.city,
            total=row.total,
            opportunities=row.opportunities,
            opportunity_rate=round(row.opportunities / row.total * 100) if row.total else 0,
            revenue_won=Decimal(str(row.revenue_won)),
        )
        for row in rows
        if row.city
    ]


def get_revenue_by_month(db: Session) -> list[RevenueByMonth]:
    rows = db.execute(
        select(
            func.to_char(func.date_trunc("month", Business.won_at), "YYYY-MM").label("month"),
            func.coalesce(func.sum(Business.deal_value), 0).label("revenue"),
            func.count().label("deals"),
        )
        .where(
            Business.contact_status == ContactStatus.WON.value,
            Business.won_at.is_not(None),
        )
        .group_by(func.date_trunc("month", Business.won_at))
        .order_by(func.date_trunc("month", Business.won_at))
    ).all()
    return [
        RevenueByMonth(month=row.month, revenue=Decimal(str(row.revenue)), deals=row.deals)
        for row in rows
    ]
