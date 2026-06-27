from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_name: Mapped[str] = mapped_column(sa.String(255))
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    salesperson: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="OPEN")
    estimated_value: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    probability: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    expected_close_date: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    actual_close_date: Mapped[sa.Date | None] = mapped_column(sa.Date, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    won_reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
