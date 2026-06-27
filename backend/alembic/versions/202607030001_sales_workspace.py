"""sales workspace tables

Revision ID: 202607030001
Revises: 202607020001
Create Date: 2026-07-03 09:00:00.000000
"""
from collections.abc import Sequence

revision: str = "202607030001"
down_revision: str | None = "202607020001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
