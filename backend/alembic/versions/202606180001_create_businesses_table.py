"""create businesses table

Revision ID: 202606180001
Revises:
Create Date: 2026-06-18 00:01:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606180001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("rating", sa.Numeric(precision=2, scale=1), nullable=True),
        sa.Column("review_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_businesses_category"), "businesses", ["category"], unique=False)
    op.create_index(op.f("ix_businesses_city"), "businesses", ["city"], unique=False)
    op.create_index(op.f("ix_businesses_name"), "businesses", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_businesses_name"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_city"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_category"), table_name="businesses")
    op.drop_table("businesses")
