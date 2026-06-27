from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.errors import db_error_handler
from app.db.session import get_db
from app.models.playbook import SalesPlaybook
from app.schemas.playbook import PlaybookCreate, PlaybookRead, PlaybookUpdate

router = APIRouter()


@router.get("/playbooks", response_model=list[PlaybookRead])
@db_error_handler("list playbooks")
def list_playbooks(
    db: Annotated[Session, Depends(get_db)],
    active_only: Annotated[bool, Query()] = True,
) -> list[PlaybookRead]:
    q = db.query(SalesPlaybook)
    if active_only:
        q = q.filter(SalesPlaybook.is_active.is_(True))
    return q.order_by(SalesPlaybook.is_default.desc(), SalesPlaybook.name).all()


@router.post("/playbooks", response_model=PlaybookRead, status_code=status.HTTP_201_CREATED)
@db_error_handler("create playbook")
def create_playbook(payload: PlaybookCreate, db: Annotated[Session, Depends(get_db)]) -> PlaybookRead:
    pb = SalesPlaybook(**payload.model_dump())
    db.add(pb)
    db.commit()
    db.refresh(pb)
    return pb


@router.put("/playbooks/{playbook_id}", response_model=PlaybookRead)
@db_error_handler("update playbook")
def update_playbook(
    playbook_id: int,
    payload: PlaybookUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> PlaybookRead:
    pb = db.get(SalesPlaybook, playbook_id)
    if pb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pb, field, value)
    db.commit()
    db.refresh(pb)
    return pb


@router.delete("/playbooks/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
@db_error_handler("delete playbook")
def delete_playbook(playbook_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    pb = db.get(SalesPlaybook, playbook_id)
    if pb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found.")
    if pb.is_default:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Default playbooks cannot be deleted.")
    db.delete(pb)
    db.commit()
