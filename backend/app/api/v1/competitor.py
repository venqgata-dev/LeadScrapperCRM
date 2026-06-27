from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.errors import db_error_handler
from app.db.session import get_db
from app.models.competitor import CompetitorSnapshot
from app.schemas.competitor import CompetitorRead, CompetitorUpsert

router = APIRouter()


@router.get("/businesses/{business_id}/competitor", response_model=CompetitorRead | None)
@db_error_handler("get competitor snapshot")
def get_competitor(business_id: int, db: Annotated[Session, Depends(get_db)]) -> CompetitorRead | None:
    return db.query(CompetitorSnapshot).filter(CompetitorSnapshot.business_id == business_id).first()


@router.put("/businesses/{business_id}/competitor", response_model=CompetitorRead)
@db_error_handler("upsert competitor snapshot")
def upsert_competitor(
    business_id: int,
    payload: CompetitorUpsert,
    db: Annotated[Session, Depends(get_db)],
) -> CompetitorRead:
    snap = db.query(CompetitorSnapshot).filter(CompetitorSnapshot.business_id == business_id).first()
    if snap is None:
        snap = CompetitorSnapshot(business_id=business_id, **payload.model_dump())
        db.add(snap)
    else:
        for field, value in payload.model_dump().items():
            setattr(snap, field, value)
    db.commit()
    db.refresh(snap)
    return snap
