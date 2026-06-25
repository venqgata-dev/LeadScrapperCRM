from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(min_length=1, max_length=120)
    provider: str = Field(min_length=1, max_length=50)
    category: str = Field(min_length=1, max_length=255)
    category_group: str | None = Field(default=None, max_length=120)
    cities: list[str] = Field(min_length=1)
    search_type: str = Field(default="custom", max_length=20)
    expand_keywords: bool = Field(default=True)
    expand_neighbors: bool = Field(default=False)
    auto_import: bool = Field(default=False)


class CampaignRead(BaseModel):
    id: int
    name: str
    country: str
    provider: str
    category: str
    category_group: str | None = None
    cities: list[str]
    search_type: str
    expand_keywords: bool
    expand_neighbors: bool
    auto_import: bool
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: int | None = None
    raw_results: int
    deduped_results: int
    opportunities: int
    imported: int
    api_requests: int
    estimated_cost: float
    progress_data: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignStats(BaseModel):
    total: int
    running: int
    completed: int
    businesses_found: int
    imported: int
    opportunities: int
    estimated_cost: float


class DuplicateWarning(BaseModel):
    is_duplicate: bool
    similar_campaigns: list[CampaignRead]
    warning_message: str | None = None
