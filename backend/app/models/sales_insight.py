from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SalesInsight(Base):
    __tablename__ = "sales_insights"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("businesses.id"))
    overall_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    priority: Mapped[str] = mapped_column(sa.String(20), default="MEDIUM")
    website_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    seo_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    trust_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    contact_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    social_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    opportunity_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    pain_points: Mapped[list] = mapped_column(sa.JSON(), default=list)
    strengths: Mapped[list] = mapped_column(sa.JSON(), default=list)
    recommendations: Mapped[list] = mapped_column(sa.JSON(), default=list)
    recommended_services: Mapped[list] = mapped_column(sa.JSON(), default=list)
    recommended_pitch: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    next_best_action: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    estimated_project_value: Mapped[int] = mapped_column(sa.Integer, default=0)
    estimated_close_probability: Mapped[int] = mapped_column(sa.Integer, default=0)
    talking_points: Mapped[list | None] = mapped_column(sa.JSON(), nullable=True)
    objection_responses: Mapped[dict | None] = mapped_column(sa.JSON(), nullable=True)
    opportunity_report: Mapped[dict | None] = mapped_column(sa.JSON(), nullable=True)
    generated_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_at: Mapped[sa.DateTime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
