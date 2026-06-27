from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SalesCampaign(Base):
    __tablename__ = "sales_campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(sa.String(255))
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    campaign_type: Mapped[str] = mapped_column(sa.String(50))
    status: Mapped[str] = mapped_column(sa.String(50), default="DRAFT")
    country: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    min_ai_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    min_project_value: Mapped[int] = mapped_column(sa.Integer, default=0)
    min_close_probability: Mapped[int] = mapped_column(sa.Integer, default=0)
    target_count: Mapped[int] = mapped_column(sa.Integer, default=0)
    contacted_count: Mapped[int] = mapped_column(sa.Integer, default=0)
    replied_count: Mapped[int] = mapped_column(sa.Integer, default=0)
    booked_count: Mapped[int] = mapped_column(sa.Integer, default=0)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class SalesTask(Base):
    __tablename__ = "sales_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("sales_campaigns.id"), nullable=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    task_type: Mapped[str] = mapped_column(sa.String(50))
    status: Mapped[str] = mapped_column(sa.String(50), default="PENDING")
    priority: Mapped[int] = mapped_column(sa.Integer, default=0)
    due_date: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    completed_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(sa.String(255))
    template_type: Mapped[str] = mapped_column(sa.String(50))
    subject_template: Mapped[str] = mapped_column(sa.Text)
    body_template: Mapped[str] = mapped_column(sa.Text)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class EmailHistory(Base):
    __tablename__ = "email_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    template_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("email_templates.id"), nullable=True)
    subject: Mapped[str] = mapped_column(sa.Text)
    body: Mapped[str] = mapped_column(sa.Text)
    status: Mapped[str] = mapped_column(sa.String(50), default="SENT")
    sent_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())


class OutreachCall(Base):
    __tablename__ = "outreach_calls"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    script_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    outcome: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    called_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    task_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    follow_up_type: Mapped[str] = mapped_column(sa.String(50))
    scheduled_for: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True))
    status: Mapped[str] = mapped_column(sa.String(50), default="PENDING")
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
