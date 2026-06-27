from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlaybookRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    applies_to: list[str] = []
    opening: str | None = None
    questions: list[str] = []
    pain_points: list[str] = []
    closing: str | None = None
    objection_handling: dict[str, str] = {}
    is_default: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaybookCreate(BaseModel):
    name: str
    description: str | None = None
    applies_to: list[str] = []
    opening: str | None = None
    questions: list[str] = []
    pain_points: list[str] = []
    closing: str | None = None
    objection_handling: dict[str, str] = {}
    is_active: bool = True


class PlaybookUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    applies_to: list[str] | None = None
    opening: str | None = None
    questions: list[str] | None = None
    pain_points: list[str] | None = None
    closing: str | None = None
    objection_handling: dict[str, str] | None = None
    is_active: bool | None = None
