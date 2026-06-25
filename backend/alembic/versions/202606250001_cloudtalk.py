"""add cloudtalk integration

Revision ID: 202606250001
Revises: 202606240003
Create Date: 2026-06-25 10:00:00.000000

Additive only — no columns dropped, no tables dropped.
Adds cloudtalk_contact_id and last_call_id to businesses.
Creates cloudtalk_calls table.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606250001"
down_revision: str | None = "202606240003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("cloudtalk_contact_id", sa.String(64), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("last_call_id", sa.String(64), nullable=True),
    )
    op.create_index(
        "ix_businesses_cloudtalk_contact_id",
        "businesses",
        ["cloudtalk_contact_id"],
    )

    op.create_table(
        "cloudtalk_calls",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("cloudtalk_call_id", sa.String(64), nullable=True),
        sa.Column("direction", sa.String(16), nullable=False, server_default="OUTBOUND"),
        sa.Column("status", sa.String(32), nullable=False, server_default=""),
        sa.Column("duration", sa.Integer, nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recording_url", sa.String(1000), nullable=True),
        sa.Column("agent", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_cloudtalk_calls_cloudtalk_call_id",
        "cloudtalk_calls",
        ["cloudtalk_call_id"],
    )
    op.create_index(
        "ix_cloudtalk_calls_created_at",
        "cloudtalk_calls",
        ["created_at"],
    )


def downgrade() -> None:
    pass
