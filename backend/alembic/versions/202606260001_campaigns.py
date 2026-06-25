"""add search_campaigns table

Revision ID: 202606260001
Revises: 202606250001
Create Date: 2026-06-26 09:00:00.000000

Additive only — no existing tables or columns modified.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606260001"
down_revision: str | None = "202606250001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "search_campaigns",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("country", sa.String(120), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("category", sa.String(255), nullable=False),
        sa.Column("category_group", sa.String(120), nullable=True),
        sa.Column("cities", sa.JSON, nullable=False),
        sa.Column("search_type", sa.String(20), nullable=False, server_default="custom"),
        sa.Column("expand_keywords", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("expand_neighbors", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("auto_import", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("status", sa.String(20), nullable=False, server_default="Draft"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("raw_results", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deduped_results", sa.Integer, nullable=False, server_default="0"),
        sa.Column("opportunities", sa.Integer, nullable=False, server_default="0"),
        sa.Column("imported", sa.Integer, nullable=False, server_default="0"),
        sa.Column("api_requests", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_cost", sa.Numeric(10, 6), nullable=False, server_default="0"),
        sa.Column("progress_data", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_search_campaigns_id", "search_campaigns", ["id"])
    op.create_index("ix_search_campaigns_name", "search_campaigns", ["name"])
    op.create_index("ix_search_campaigns_status", "search_campaigns", ["status"])
    op.create_index("ix_search_campaigns_created_at", "search_campaigns", ["created_at"])


def downgrade() -> None:
    pass
