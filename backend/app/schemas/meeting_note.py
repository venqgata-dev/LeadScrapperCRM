from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeetingNoteRead(BaseModel):
    id: int
    business_id: int
    summary: str | None = None
    requirements: str | None = None
    budget: str | None = None
    deadline: str | None = None
    competitors: list[str] = []
    decision_maker: str | None = None
    next_meeting: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeetingNoteUpsert(BaseModel):
    summary: str | None = None
    requirements: str | None = None
    budget: str | None = None
    deadline: str | None = None
    competitors: list[str] = []
    decision_maker: str | None = None
    next_meeting: datetime | None = None
