from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CallScript(Base):
    __tablename__ = "call_scripts"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    script_text: Mapped[str] = mapped_column(sa.Text)
    opening_line: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    pain_point_hook: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    value_proposition: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    call_to_action: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    generated_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
