from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.errors import db_error_handler
from app.db.session import get_db
from app.models.meeting_note import MeetingNote
from app.schemas.meeting_note import MeetingNoteRead, MeetingNoteUpsert

router = APIRouter()


@router.get("/businesses/{business_id}/meeting-notes", response_model=MeetingNoteRead | None)
@db_error_handler("get meeting notes")
def get_meeting_notes(business_id: int, db: Annotated[Session, Depends(get_db)]) -> MeetingNoteRead | None:
    return db.query(MeetingNote).filter(MeetingNote.business_id == business_id).first()


@router.put("/businesses/{business_id}/meeting-notes", response_model=MeetingNoteRead)
@db_error_handler("upsert meeting notes")
def upsert_meeting_notes(
    business_id: int,
    payload: MeetingNoteUpsert,
    db: Annotated[Session, Depends(get_db)],
) -> MeetingNoteRead:
    note = db.query(MeetingNote).filter(MeetingNote.business_id == business_id).first()
    if note is None:
        note = MeetingNote(business_id=business_id, **payload.model_dump())
        db.add(note)
    else:
        for field, value in payload.model_dump().items():
            setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note
