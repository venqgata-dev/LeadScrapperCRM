"""add email_source to businesses

Revision ID: 202606240003
Revises: 202606240002
Create Date: 2026-06-24 15:00:00.000000

Additive only — no columns dropped, no tables dropped.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606240003"
down_revision: str | None = "202606240002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("email_source", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    pass
