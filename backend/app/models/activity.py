from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str] = mapped_column(sa.String(100))
    business_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"), nullable=True)
    business_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    title: Mapped[str] = mapped_column(sa.String(255))
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(sa.JSON(), nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
