from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity import Activity
from app.models.business import Business
from app.models.deal import Deal
from app.models.proposal import Project
from app.schemas.deal import DealCreate, DealRead, DealUpdate, MarkLostRequest, MarkWonRequest
from app.schemas.proposal import ProjectRead

router = APIRouter(tags=["deals"])

DEFAULT_DELIVERABLES = [
    "Logo", "Homepage", "Services", "Gallery", "Contact",
    "SEO", "Analytics", "Security", "Backup", "Training", "Invoice",
]


def _read(deal: Deal, db: Session) -> DealRead:
    biz = db.get(Business, deal.business_id)
    d = DealRead.model_validate(deal)
    d.business_name = biz.name if biz else None
    return d


# ─── List ─────────────────────────────────────────────────────────────────────

@router.get("/deals", response_model=list[DealRead])
def list_deals(
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
    business_id: int | None = None,
) -> list[DealRead]:
    stmt = select(Deal).order_by(desc(Deal.created_at))
    if status:
        stmt = stmt.where(Deal.status == status)
    if business_id:
        stmt = stmt.where(Deal.business_id == business_id)
    return [_read(d, db) for d in db.execute(stmt).scalars()]


@router.get("/deals/stats")
def deal_stats(db: Annotated[Session, Depends(get_db)]) -> dict:
    rows = db.execute(select(Deal)).scalars().all()
    now = datetime.now(tz=timezone.utc)
    won_this_month = [d for d in rows if d.status == "WON" and d.actual_close_date and
                      d.actual_close_date.year == now.year and d.actual_close_date.month == now.month]
    lost_this_month = [d for d in rows if d.status == "LOST" and d.actual_close_date and
                       d.actual_close_date.year == now.year and d.actual_close_date.month == now.month]
    open_deals = [d for d in rows if d.status == "OPEN"]
    pipeline_value = sum(float(d.estimated_value or 0) * (d.probability or 100) / 100 for d in open_deals)
    return {
        "open": len(open_deals),
        "won_this_month": len(won_this_month),
        "lost_this_month": len(lost_this_month),
        "pipeline_value": round(pipeline_value, 2),
        "revenue_won_this_month": sum(float(d.estimated_value or 0) for d in won_this_month),
    }


# ─── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/businesses/{business_id}/deals", response_model=list[DealRead])
def list_business_deals(business_id: int, db: Annotated[Session, Depends(get_db)]) -> list[DealRead]:
    stmt = select(Deal).where(Deal.business_id == business_id).order_by(desc(Deal.created_at))
    return [_read(d, db) for d in db.execute(stmt).scalars()]


@router.post("/businesses/{business_id}/deals", response_model=DealRead, status_code=201)
def create_deal(
    business_id: int,
    payload: DealCreate,
    db: Annotated[Session, Depends(get_db)],
) -> DealRead:
    biz = db.get(Business, business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    deal = Deal(business_id=business_id, **payload.model_dump())
    db.add(deal)
    db.flush()
    _log(db, "DEAL_CREATED", biz.id, biz.name, f"Deal created: {deal.deal_name}")
    db.commit()
    db.refresh(deal)
    return _read(deal, db)


@router.get("/deals/{deal_id}", response_model=DealRead)
def get_deal(deal_id: int, db: Annotated[Session, Depends(get_db)]) -> DealRead:
    deal = _get_or_404(db, deal_id)
    return _read(deal, db)


@router.patch("/deals/{deal_id}", response_model=DealRead)
def update_deal(
    deal_id: int,
    payload: DealUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> DealRead:
    deal = _get_or_404(db, deal_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(deal, k, v)
    deal.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(deal)
    return _read(deal, db)


@router.delete("/deals/{deal_id}", status_code=204)
def delete_deal(deal_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    deal = _get_or_404(db, deal_id)
    db.delete(deal)
    db.commit()


# ─── Win / Lose workflow ──────────────────────────────────────────────────────

@router.post("/deals/{deal_id}/mark-won", response_model=DealRead)
def mark_won(
    deal_id: int,
    payload: MarkWonRequest,
    db: Annotated[Session, Depends(get_db)],
) -> DealRead:
    deal = _get_or_404(db, deal_id)
    if deal.status == "WON":
        raise HTTPException(status_code=400, detail="Deal is already WON")

    deal.status = "WON"
    deal.won_reason = payload.won_reason
    deal.actual_close_date = payload.actual_close_date or date.today()
    deal.updated_at = datetime.now(tz=timezone.utc)

    biz = db.get(Business, deal.business_id)
    if biz:
        biz.contact_status = "WON"
        biz.won_at = datetime.now(tz=timezone.utc)
        biz.updated_at = datetime.now(tz=timezone.utc)

    project: Project | None = None
    if payload.create_project:
        project = Project(
            business_id=deal.business_id,
            name=f"{deal.deal_name} — Website",
            deal_id=deal.id,
            status="PLANNING",
            priority="MEDIUM",
            total_value=deal.estimated_value,
            developer=None,
        )
        db.add(project)
        db.flush()

        from app.models.proposal import ProjectDeliverable
        for i, name in enumerate(DEFAULT_DELIVERABLES):
            db.add(ProjectDeliverable(project_id=project.id, name=name, sort_order=i))

    _log(db, "DEAL_WON", deal.business_id, biz.name if biz else None,
         f"🎉 Deal WON: {deal.deal_name}",
         f"Value: €{deal.estimated_value or 0:,.0f}" + (f" | Reason: {payload.won_reason}" if payload.won_reason else ""))

    if project:
        _log(db, "PROJECT_CREATED", deal.business_id, biz.name if biz else None,
             f"Project created: {project.name}", "Automatically created from won deal")

    db.commit()
    db.refresh(deal)
    return _read(deal, db)


@router.post("/deals/{deal_id}/mark-lost", response_model=DealRead)
def mark_lost(
    deal_id: int,
    payload: MarkLostRequest,
    db: Annotated[Session, Depends(get_db)],
) -> DealRead:
    deal = _get_or_404(db, deal_id)
    if deal.status == "LOST":
        raise HTTPException(status_code=400, detail="Deal is already LOST")

    deal.status = "LOST"
    deal.lost_reason = payload.lost_reason
    deal.actual_close_date = payload.actual_close_date or date.today()
    deal.updated_at = datetime.now(tz=timezone.utc)

    biz = db.get(Business, deal.business_id)
    _log(db, "DEAL_LOST", deal.business_id, biz.name if biz else None,
         f"Deal lost: {deal.deal_name}", f"Reason: {payload.lost_reason}")

    db.commit()
    db.refresh(deal)
    return _read(deal, db)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, deal_id: int) -> Deal:
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    return deal


def _log(db: Session, event_type: str, business_id: int | None, business_name: str | None,
         title: str, description: str | None = None) -> None:
    db.add(Activity(
        event_type=event_type,
        business_id=business_id,
        business_name=business_name,
        title=title,
        description=description,
    ))
