from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompetitorRead(BaseModel):
    id: int
    business_id: int
    main_competitors: list[str] = []
    notes: str | None = None
    strengths: list[str] = []
    weaknesses: list[str] = []
    opportunities: list[str] = []
    threats: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompetitorUpsert(BaseModel):
    main_competitors: list[str] = []
    notes: str | None = None
    strengths: list[str] = []
    weaknesses: list[str] = []
    opportunities: list[str] = []
    threats: list[str] = []
