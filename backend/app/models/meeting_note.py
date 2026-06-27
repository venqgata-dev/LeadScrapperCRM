from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"), unique=True)
    summary: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    requirements: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    budget: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    deadline: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    competitors: Mapped[list] = mapped_column(sa.JSON(), default=list)
    decision_maker: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    next_meeting: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
