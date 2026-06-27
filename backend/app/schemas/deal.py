from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class DealCreate(BaseModel):
    deal_name: str = Field(min_length=1, max_length=255)
    salesperson: str | None = None
    status: str = "OPEN"
    estimated_value: Decimal | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: date | None = None
    notes: str | None = None


class DealUpdate(BaseModel):
    deal_name: str | None = None
    salesperson: str | None = None
    status: str | None = None
    estimated_value: Decimal | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: date | None = None
    actual_close_date: date | None = None
    lost_reason: str | None = None
    won_reason: str | None = None
    notes: str | None = None


class DealRead(BaseModel):
    id: int
    deal_name: str
    business_id: int
    business_name: str | None = None
    salesperson: str | None = None
    status: str
    estimated_value: Decimal | None = None
    probability: int | None = None
    expected_close_date: date | None = None
    actual_close_date: date | None = None
    lost_reason: str | None = None
    won_reason: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarkWonRequest(BaseModel):
    won_reason: str | None = None
    actual_close_date: date | None = None
    create_project: bool = True


class MarkLostRequest(BaseModel):
    lost_reason: str = Field(min_length=1)
    actual_close_date: date | None = None
