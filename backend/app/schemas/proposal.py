from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProposalCreate(BaseModel):
    title: str = Field(default="Untitled Proposal", min_length=1, max_length=255)
    status: str = "DRAFT"
    value: Decimal | None = None
    expected_close_date: date | None = None
    notes: str | None = None


class ProposalUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    value: Decimal | None = None
    expected_close_date: date | None = None
    notes: str | None = None
    sent_at: datetime | None = None
    viewed_at: datetime | None = None
    responded_at: datetime | None = None


class ProposalRead(BaseModel):
    id: int
    business_id: int
    title: str
    status: str
    value: Decimal | None = None
    expected_close_date: date | None = None
    notes: str | None = None
    sent_at: datetime | None = None
    viewed_at: datetime | None = None
    responded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    package: str | None = None
    developer: str | None = None
    designer: str | None = None
    project_manager: str | None = None
    expected_delivery: date | None = None
    start_date: date | None = None
    priority: str = "MEDIUM"
    status: str = "PLANNING"
    notes: str | None = None
    total_value: Decimal | None = None
    deposit: Decimal | None = None
    paid_amount: Decimal | None = None
    deal_id: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    package: str | None = None
    developer: str | None = None
    designer: str | None = None
    project_manager: str | None = None
    expected_delivery: date | None = None
    start_date: date | None = None
    priority: str | None = None
    status: str | None = None
    notes: str | None = None
    completion_pct: int | None = Field(default=None, ge=0, le=100)
    total_value: Decimal | None = None
    deposit: Decimal | None = None
    paid_amount: Decimal | None = None
    deal_id: int | None = None


class ProjectRead(BaseModel):
    id: int
    business_id: int
    name: str
    package: str | None = None
    developer: str | None = None
    designer: str | None = None
    project_manager: str | None = None
    expected_delivery: date | None = None
    start_date: date | None = None
    priority: str
    status: str
    completion_pct: int = 0
    notes: str | None = None
    deal_id: int | None = None
    total_value: Decimal | None = None
    deposit: Decimal | None = None
    paid_amount: Decimal | None = None
    business_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Deliverables ─────────────────────────────────────────────────────────────

class DeliverableCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    assigned_to: str | None = None
    sort_order: int = 0


class DeliverableUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    completed_at: datetime | None = None
    sort_order: int | None = None


class DeliverableRead(BaseModel):
    id: int
    project_id: int
    name: str
    status: str
    assigned_to: str | None = None
    completed_at: datetime | None = None
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Comments ─────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    author: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1)
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    body: str = Field(min_length=1)


class CommentRead(BaseModel):
    id: int
    project_id: int
    author: str
    body: str
    parent_id: int | None = None
    created_at: datetime
    updated_at: datetime
    replies: list["CommentRead"] = []

    model_config = ConfigDict(from_attributes=True)


CommentRead.model_rebuild()


# ─── Client Credentials ───────────────────────────────────────────────────────

class CredentialUpsert(BaseModel):
    hosting_provider: str | None = None
    hosting_url: str | None = None
    hosting_user: str | None = None
    hosting_pass: str | None = None
    domain_name: str | None = None
    domain_registrar: str | None = None
    domain_expiry: date | None = None
    wp_admin_url: str | None = None
    wp_admin_user: str | None = None
    wp_admin_pass: str | None = None
    ftp_host: str | None = None
    ftp_user: str | None = None
    ftp_pass: str | None = None
    cpanel_url: str | None = None
    cpanel_user: str | None = None
    cloudflare_email: str | None = None
    cloudflare_zone: str | None = None
    ga_property_id: str | None = None
    gsc_property_url: str | None = None
    gbp_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    other_notes: str | None = None


class CredentialRead(CredentialUpsert):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
