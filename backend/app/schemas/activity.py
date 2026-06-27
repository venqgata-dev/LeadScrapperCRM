from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityCreate(BaseModel):
    event_type: str
    business_id: int | None = None
    business_name: str | None = None
    title: str
    description: str | None = None
    meta: dict | None = None


class ActivityRead(BaseModel):
    id: int
    event_type: str
    business_id: int | None = None
    business_name: str | None = None
    title: str
    description: str | None = None
    meta: dict | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
