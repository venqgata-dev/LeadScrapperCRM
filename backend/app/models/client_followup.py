from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ClientFollowUp(Base):
    __tablename__ = "client_follow_ups"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    follow_up_date: Mapped[sa.Date] = mapped_column(sa.Date)
    follow_up_time: Mapped[sa.Time | None] = mapped_column(sa.Time, nullable=True)
    type: Mapped[str] = mapped_column(sa.String(50))
    priority: Mapped[str] = mapped_column(sa.String(20), default="MEDIUM")
    status: Mapped[str] = mapped_column(sa.String(50), default="PENDING")
    assigned_to: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    reminder_sent: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    completed_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())


class ClientDocument(Base):
    __tablename__ = "client_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    filename: Mapped[str] = mapped_column(sa.String(255))
    original_name: Mapped[str] = mapped_column(sa.String(255))
    category: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    file_size: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    version: Mapped[int] = mapped_column(sa.Integer, default=1)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    uploaded_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())


class ClientCredentials(Base):
    __tablename__ = "client_credentials"

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
