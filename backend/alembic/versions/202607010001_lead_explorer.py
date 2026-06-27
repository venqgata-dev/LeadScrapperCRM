"""lead explorer fields

Revision ID: 202607010001
Revises: 202606300001
Create Date: 2026-07-01 09:00:00.000000
"""
from collections.abc import Sequence

revision: str = "202607010001"
down_revision: str | None = "202606300001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
