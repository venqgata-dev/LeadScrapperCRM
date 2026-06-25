"""add country and notes fields

Revision ID: 202606240001
Revises: 202606180003
Create Date: 2026-06-24 00:01:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606240001"
down_revision: str | None = "202606180003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("country", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_businesses_country", "businesses", ["country"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_businesses_country", table_name="businesses")
    op.drop_column("businesses", "notes")
    op.drop_column("businesses", "country")
