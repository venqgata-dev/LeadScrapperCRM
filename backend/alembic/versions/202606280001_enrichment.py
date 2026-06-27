"""enrichment fields

Revision ID: 202606280001
Revises: 202606270002
Create Date: 2026-06-28 09:00:00.000000
"""
from collections.abc import Sequence

revision: str = "202606280001"
down_revision: str | None = "202606270002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
