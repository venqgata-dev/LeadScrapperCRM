from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    title: Mapped[str] = mapped_column(sa.String(255))
    status: Mapped[str] = mapped_column(sa.String(50), default="DRAFT")
    value: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    version: Mapped[int] = mapped_column(sa.Integer, default=1)
    filename: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    expected_close_date: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    sent_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    viewed_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    responded_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    name: Mapped[str] = mapped_column(sa.String(255))
    package: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    developer: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    designer: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    project_manager: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    expected_delivery: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    start_date: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    priority: Mapped[str] = mapped_column(sa.String(20), default="MEDIUM")
    status: Mapped[str] = mapped_column(sa.String(50), default="ACTIVE")
    completion_pct: Mapped[int] = mapped_column(sa.Integer, default=0)
    deal_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("deals.id"), nullable=True)
    total_value: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    deposit: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    paid_amount: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class ProjectDeliverable(Base):
    __tablename__ = "project_deliverables"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("projects.id"))
    hosting_provider: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    hosting_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    hosting_user: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    hosting_pass: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    domain_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    domain_registrar: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    domain_expiry: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    wp_admin_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    wp_admin_user: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    wp_admin_pass: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    ftp_host: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    ftp_user: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    ftp_pass: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    cpanel_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    cpanel_user: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    cloudflare_email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    cloudflare_zone: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    ga_property_id: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    gsc_property_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    gbp_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    other_notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("projects.id"))
    body: Mapped[str] = mapped_column(sa.Text)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    pinned: Mapped[bool] = mapped_column(sa.Boolean, default=False)
