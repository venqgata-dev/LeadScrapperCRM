"""sales assistant tables: playbooks, meeting notes, competitor snapshots

Revision ID: 202607070001
Revises: 202607060001
Create Date: 2026-07-07 09:00:00.000000
"""
from collections.abc import Sequence

revision: str = "202607070001"
down_revision: str | None = "202607060001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
