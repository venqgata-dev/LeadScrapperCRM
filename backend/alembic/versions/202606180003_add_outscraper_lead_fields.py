"""add outscraper lead fields

Revision ID: 202606180003
Revises: 202606180002
Create Date: 2026-06-18 00:03:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606180003"
down_revision: str | None = "202606180002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("google_maps_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("facebook_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("instagram_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("linkedin_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("website_checked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("opportunity_reason", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_businesses_name_phone",
        "businesses",
        ["name", "phone"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_businesses_name_phone", table_name="businesses")
    op.drop_column("businesses", "opportunity_reason")
    op.drop_column("businesses", "website_checked_at")
    op.drop_column("businesses", "linkedin_url")
    op.drop_column("businesses", "instagram_url")
    op.drop_column("businesses", "facebook_url")
    op.drop_column("businesses", "google_maps_url")
