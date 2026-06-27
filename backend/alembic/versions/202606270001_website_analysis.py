"""website analysis columns

Revision ID: 202606270001
Revises: 202606260001
Create Date: 2026-06-27 09:00:00.000000
"""
from collections.abc import Sequence

revision: str = "202606270001"
down_revision: str | None = "202606260001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
