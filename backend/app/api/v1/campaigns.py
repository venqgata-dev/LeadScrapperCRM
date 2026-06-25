import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.campaign import (
    CampaignCreate,
    CampaignRead,
    CampaignStats,
    DuplicateWarning,
)
from app.services.campaigns import (
    campaign_stats,
    cancel_campaign,
    check_duplicate,
    create_campaign,
    delete_campaign,
    get_campaign,
    list_campaigns,
    pause_campaign,
    resume_campaign,
    start_campaign,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/stats", response_model=CampaignStats)
def get_stats(db: Session = Depends(get_db)) -> CampaignStats:
    return campaign_stats(db)


@router.get("", response_model=list[CampaignRead])
def list_all(db: Session = Depends(get_db)) -> list[CampaignRead]:
    return list_campaigns(db)  # type: ignore[return-value]


@router.post("", response_model=CampaignRead, status_code=201)
def create(payload: CampaignCreate, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = create_campaign(db, payload)
    return campaign  # type: ignore[return-value]


@router.post("/check-duplicate", response_model=DuplicateWarning)
def check_dup(payload: CampaignCreate, db: Session = Depends(get_db)) -> DuplicateWarning:
    similar = check_duplicate(db, payload)
    if not similar:
        return DuplicateWarning(is_duplicate=False, similar_campaigns=[])

    days_ago = None
    if similar[0].completed_at:
        from datetime import UTC, datetime
        delta = datetime.now(UTC) - similar[0].completed_at.replace(tzinfo=UTC) if similar[0].completed_at.tzinfo is None else datetime.now(UTC) - similar[0].completed_at
        days_ago = int(delta.total_seconds() / 86400)

    msg = (
        f'"{payload.country}" · "{payload.category}" · {payload.provider} '
        f"was already searched {days_ago} day(s) ago."
        if days_ago is not None
        else f'"{payload.country}" · "{payload.category}" · {payload.provider} was recently searched.'
    )
    return DuplicateWarning(
        is_duplicate=True,
        similar_campaigns=similar,  # type: ignore[arg-type]
        warning_message=msg,
    )


@router.get("/{campaign_id}", response_model=CampaignRead)
def get_one(campaign_id: int, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign  # type: ignore[return-value]


@router.post("/{campaign_id}/start", response_model=CampaignRead)
def start(campaign_id: int, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = start_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign  # type: ignore[return-value]


@router.post("/{campaign_id}/pause", response_model=CampaignRead)
def pause(campaign_id: int, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = pause_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign  # type: ignore[return-value]


@router.post("/{campaign_id}/resume", response_model=CampaignRead)
def resume(campaign_id: int, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = resume_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign  # type: ignore[return-value]


@router.post("/{campaign_id}/cancel", response_model=CampaignRead)
def cancel(campaign_id: int, db: Session = Depends(get_db)) -> CampaignRead:
    campaign = cancel_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign  # type: ignore[return-value]


@router.delete("/{campaign_id}", status_code=204)
def delete(campaign_id: int, db: Session = Depends(get_db)) -> None:
    if not delete_campaign(db, campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")
