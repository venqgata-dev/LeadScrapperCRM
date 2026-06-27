from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel


class FollowUpCreate(BaseModel):
    business_id: int
    follow_up_date: date
    follow_up_time: Optional[time] = None
    type: str = "CALL"
    priority: str = "MEDIUM"
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    follow_up_date: Optional[date] = None
    follow_up_time: Optional[time] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class FollowUpRead(BaseModel):
    id: int
    business_id: int
    business_name: Optional[str] = None
    follow_up_date: date
    follow_up_time: Optional[time] = None
    type: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    reminder_sent: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentRead(BaseModel):
    id: int
    business_id: int
    filename: str
    original_name: str
    category: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int
    notes: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    notes: Optional[str] = None
