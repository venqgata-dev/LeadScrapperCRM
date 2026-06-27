from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityRead

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", response_model=ActivityRead, status_code=201)
def create_activity(
    payload: ActivityCreate,
    db: Annotated[Session, Depends(get_db)],
) -> ActivityRead:
    activity = Activity(**payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return ActivityRead.model_validate(activity)


@router.get("", response_model=list[ActivityRead])
def list_activities(
    db: Annotated[Session, Depends(get_db)],
    business_id: Annotated[int | None, Query()] = None,
    event_type: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ActivityRead]:
    stmt = select(Activity).order_by(desc(Activity.created_at)).limit(limit).offset(offset)
    if business_id is not None:
        stmt = stmt.where(Activity.business_id == business_id)
    if event_type is not None:
        stmt = stmt.where(Activity.event_type == event_type)
    rows = db.execute(stmt).scalars().all()
    return [ActivityRead.model_validate(r) for r in rows]
