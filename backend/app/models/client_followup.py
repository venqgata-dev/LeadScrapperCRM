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


