from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ── Campaign ────────────────────────────────────────────────────────────────

class SalesCampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    campaign_type: str = "MIXED"  # COLD_CALL | EMAIL | FACEBOOK | LINKEDIN | MIXED
    country: str | None = None
    category: str | None = None
    min_ai_score: int = Field(default=0, ge=0, le=100)
    min_project_value: int = Field(default=0, ge=0)
    min_close_probability: int = Field(default=0, ge=0, le=100)
    max_businesses: int = Field(default=500, ge=1, le=5000)


class SalesCampaignRead(BaseModel):
    id: int
    name: str
    description: str | None
    campaign_type: str
    status: str
    country: str | None
    category: str | None
    min_ai_score: int
    min_project_value: int
    min_close_probability: int
    target_count: int
    contacted_count: int
    replied_count: int
    booked_count: int
    task_count: int = 0
    pending_tasks: int = 0
    completed_tasks: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Task ────────────────────────────────────────────────────────────────────

class SalesTaskRead(BaseModel):
    id: int
    campaign_id: int | None
    business_id: int
    task_type: str
    status: str
    priority: int
    due_date: datetime | None
    completed_at: datetime | None
    notes: str | None
    created_at: datetime
    # Denormalized business fields for display
    business_name: str = ""
    business_phone: str | None = None
    business_city: str | None = None
    business_category: str | None = None
    business_ai_score: int | None = None
    business_ai_priority: str | None = None
    business_ai_project_value: int | None = None
    business_ai_close_prob: int | None = None
    model_config = ConfigDict(from_attributes=True)


# ── Call Script ─────────────────────────────────────────────────────────────

class CallScriptRead(BaseModel):
    id: int
    business_id: int
    script_text: str
    opening_line: str | None
    pain_point_hook: str | None
    value_proposition: str | None
    call_to_action: str | None
    generated_at: datetime | None
    updated_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


# ── Email Template ───────────────────────────────────────────────────────────

class EmailTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    template_type: str = "GENERIC"
    subject_template: str
    body_template: str
    is_active: bool = True


class EmailTemplateRead(BaseModel):
    id: int
    name: str
    template_type: str
    subject_template: str
    body_template: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Generated Email ──────────────────────────────────────────────────────────

class GeneratedEmail(BaseModel):
    subject: str
    body: str
    business_id: int
    business_name: str


class EmailHistoryRead(BaseModel):
    id: int
    business_id: int
    template_id: int | None
    subject: str
    body: str
    status: str
    sent_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Follow Up ────────────────────────────────────────────────────────────────

class FollowUpRead(BaseModel):
    id: int
    business_id: int
    task_id: int | None
    follow_up_type: str
    scheduled_for: datetime
    status: str
    notes: str | None
    created_at: datetime
    business_name: str = ""
    model_config = ConfigDict(from_attributes=True)


# ── Batch Status ─────────────────────────────────────────────────────────────

class ScriptBatchStatus(BaseModel):
    running: bool
    paused: bool
    total: int
    processed: int
    elapsed_seconds: float
    current_business: str | None
    scripts_generated: int
    emails_generated: int


# ── Analytics ────────────────────────────────────────────────────────────────

class OutreachAnalytics(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_tasks: int
    tasks_today: int
    pending_tasks: int
    completed_tasks: int
    scripts_generated: int
    emails_drafted: int
    emails_sent: int
    follow_ups_pending: int
    calls_made: int
    total_businesses_targeted: int
