from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SalesPlaybook(Base):
    __tablename__ = "sales_playbooks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(sa.String(255))
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    applies_to: Mapped[list] = mapped_column(sa.JSON(), default=list)
    opening: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    questions: Mapped[list] = mapped_column(sa.JSON(), default=list)
    pain_points: Mapped[list] = mapped_column(sa.JSON(), default=list)
    closing: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    objection_handling: Mapped[dict] = mapped_column(sa.JSON(), default=dict)
    is_default: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    created_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at: Mapped[sa.DateTime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
