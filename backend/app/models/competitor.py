from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CompetitorSnapshot(Base):
    __tablename__ = "competitor_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"), unique=True)
    main_competitors: Mapped[list] = mapped_column(sa.JSON(), default=list)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    strengths: Mapped[list] = mapped_column(sa.JSON(), default=list)
    weaknesses: Mapped[list] = mapped_column(sa.JSON(), default=list)
    opportunities: Mapped[list] = mapped_column(sa.JSON(), default=list)
    threats: Mapped[list] = mapped_column(sa.JSON(), default=list)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
