from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import db_error_handler
from app.db.session import get_db
from app.models.business import Business, CallLog
from app.models.client_followup import ClientFollowUp
from app.schemas.business import BusinessRead

router = APIRouter()


class WorkspaceStats(BaseModel):
    calls_today: int = 0
    follow_ups_today: int = 0
    follow_ups_overdue: int = 0
    hot_leads: int = 0
    in_negotiation: int = 0
    proposals_waiting: int = 0
    won_today: int = 0
    lost_today: int = 0
    total_pipeline_value: float = 0.0
    calls_this_week: int = 0
    calls_last_week: int = 0
    win_rate: float = 0.0
    avg_response_time_hours: float = 0.0
    calls_to_interested_rate: float = 0.0
    interested_to_proposal_rate: float = 0.0
    proposal_to_won_rate: float = 0.0
    top_category: str = ""
    overdue_follow_ups_pct: float = 0.0


@router.get("/workspace/stats", response_model=WorkspaceStats)
@db_error_handler("workspace stats")
def get_workspace_stats(db: Annotated[Session, Depends(get_db)]) -> WorkspaceStats:
    now = datetime.now(tz=timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    calls_today = db.query(func.count(CallLog.id)).filter(CallLog.called_at >= today_start).scalar() or 0

    from datetime import timedelta
    week_start = today_start - timedelta(days=now.weekday())
    last_week_start = week_start - timedelta(days=7)

    calls_this_week = db.query(func.count(CallLog.id)).filter(CallLog.called_at >= week_start).scalar() or 0
    calls_last_week = (
        db.query(func.count(CallLog.id))
        .filter(CallLog.called_at >= last_week_start, CallLog.called_at < week_start)
        .scalar() or 0
    )

    hot_leads = db.query(func.count(Business.id)).filter(Business.ai_priority == "HOT").scalar() or 0
    in_negotiation = db.query(func.count(Business.id)).filter(Business.contact_status == "INTERESTED").scalar() or 0
    proposals_waiting = db.query(func.count(Business.id)).filter(Business.contact_status == "PROPOSAL_SENT").scalar() or 0
    won_today = db.query(func.count(Business.id)).filter(Business.won_at >= today_start).scalar() or 0

    pipeline_value = db.query(func.coalesce(func.sum(Business.deal_value), 0)).scalar() or 0

    follow_ups_today = (
        db.query(func.count(ClientFollowUp.id))
        .filter(
            ClientFollowUp.status == "PENDING",
            ClientFollowUp.follow_up_date == today_start.date(),
        )
        .scalar() or 0
    )
    follow_ups_overdue = (
        db.query(func.count(ClientFollowUp.id))
        .filter(
            ClientFollowUp.status == "PENDING",
            ClientFollowUp.follow_up_date < today_start.date(),
        )
        .scalar() or 0
    )

    total_follow_ups = follow_ups_today + follow_ups_overdue
    overdue_pct = round(follow_ups_overdue / total_follow_ups * 100) if total_follow_ups else 0

    total_called = db.query(func.count(Business.id)).filter(Business.contact_status.in_(["CALLED", "NO_ANSWER", "INTERESTED", "PROPOSAL_SENT", "WON", "LOST"])).scalar() or 1
    total_interested = db.query(func.count(Business.id)).filter(Business.contact_status.in_(["INTERESTED", "PROPOSAL_SENT", "WON"])).scalar() or 0
    total_proposal = db.query(func.count(Business.id)).filter(Business.contact_status.in_(["PROPOSAL_SENT", "WON"])).scalar() or 0
    total_won = db.query(func.count(Business.id)).filter(Business.contact_status == "WON").scalar() or 0

    calls_to_interested = round(total_interested / total_called * 100)
    interested_to_proposal = round(total_proposal / total_interested * 100) if total_interested else 0
    proposal_to_won = round(total_won / total_proposal * 100) if total_proposal else 0
    win_rate = round(total_won / total_called * 100)

    top_cat_row = (
        db.query(Business.category, func.count(Business.id).label("cnt"))
        .filter(Business.category.isnot(None))
        .group_by(Business.category)
        .order_by(func.count(Business.id).desc())
        .first()
    )
    top_category = top_cat_row[0] if top_cat_row else ""

    return WorkspaceStats(
        calls_today=calls_today,
        follow_ups_today=follow_ups_today,
        follow_ups_overdue=follow_ups_overdue,
        hot_leads=hot_leads,
        in_negotiation=in_negotiation,
        proposals_waiting=proposals_waiting,
        won_today=won_today,
        lost_today=0,
        total_pipeline_value=float(pipeline_value),
        calls_this_week=calls_this_week,
        calls_last_week=calls_last_week,
        win_rate=win_rate,
        calls_to_interested_rate=calls_to_interested,
        interested_to_proposal_rate=interested_to_proposal,
        proposal_to_won_rate=proposal_to_won,
        top_category=top_category,
        overdue_follow_ups_pct=overdue_pct,
    )


@router.get("/workspace/hot-leads", response_model=list[BusinessRead])
@db_error_handler("hot leads")
def get_hot_leads(db: Annotated[Session, Depends(get_db)]) -> list[BusinessRead]:
    return (
        db.query(Business)
        .filter(Business.ai_priority == "HOT")
        .order_by(Business.ai_score.desc())
        .limit(20)
        .all()
    )
