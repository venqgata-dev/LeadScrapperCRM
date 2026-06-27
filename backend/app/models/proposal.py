from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, server_default="Untitled Proposal")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT", server_default="DRAFT")
    value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    business: Mapped["Business"] = relationship("Business", foreign_keys=[business_id])  # type: ignore[name-defined]


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Core
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    package: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PLANNING", server_default="PLANNING", index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM", server_default="MEDIUM")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Team (added in 202607040001)
    developer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    project_manager: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Dates
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Progress (added in 202607040001)
    completion_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Deal link (added in 202607040001)
    deal_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Financials (added in 202607040001)
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    deposit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    business: Mapped["Business"] = relationship("Business", foreign_keys=[business_id])  # type: ignore[name-defined]
    deliverables: Mapped[list["ProjectDeliverable"]] = relationship(
        "ProjectDeliverable", back_populates="project", cascade="all, delete-orphan",
        order_by="ProjectDeliverable.sort_order"
    )
    comments: Mapped[list["ProjectComment"]] = relationship(
        "ProjectComment", back_populates="project", cascade="all, delete-orphan",
        primaryjoin="and_(ProjectComment.project_id == Project.id, ProjectComment.parent_id == None)",
        order_by="ProjectComment.created_at",
        foreign_keys="[ProjectComment.project_id]",
    )
    credentials: Mapped["ClientCredential | None"] = relationship(
        "ClientCredential", back_populates="project", uselist=False, cascade="all, delete-orphan"
    )


class ProjectDeliverable(Base):
    __tablename__ = "project_deliverables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", server_default="PENDING")
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="deliverables")


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author: Mapped[str] = mapped_column(String(100), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("project_comments.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="comments", foreign_keys=[project_id])
    replies: Mapped[list["ProjectComment"]] = relationship(
        "ProjectComment", cascade="all, delete-orphan", foreign_keys=[parent_id]
    )


class ClientCredential(Base):
    __tablename__ = "client_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    hosting_provider: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hosting_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hosting_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hosting_pass: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain_registrar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    wp_admin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    wp_admin_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wp_admin_pass: Mapped[str | None] = mapped_column(Text, nullable=True)
    ftp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ftp_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ftp_pass: Mapped[str | None] = mapped_column(Text, nullable=True)
    cpanel_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cpanel_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cloudflare_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cloudflare_zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ga_property_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gsc_property_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    gbp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    other_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="credentials")
