"""add website sales fields

Revision ID: 202606180002
Revises: 202606180001
Create Date: 2026-06-18 00:02:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606180002"
down_revision: str | None = "202606180001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column(
        "businesses",
        sa.Column(
            "website_status",
            sa.String(length=32),
            server_default="HAS_WEBSITE",
            nullable=False,
        ),
    )
    op.add_column(
        "businesses",
        sa.Column("lead_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "contact_status",
            sa.String(length=50),
            server_default="NEW",
            nullable=False,
        ),
    )
    op.add_column(
        "businesses",
        sa.Column("last_contacted", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_businesses_email"), "businesses", ["email"], unique=False)
    op.create_index(
        op.f("ix_businesses_website_status"),
        "businesses",
        ["website_status"],
        unique=False,
    )
    op.create_index(op.f("ix_businesses_lead_score"), "businesses", ["lead_score"], unique=False)
    op.create_index(
        op.f("ix_businesses_contact_status"),
        "businesses",
        ["contact_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_businesses_contact_status"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_lead_score"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_website_status"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_email"), table_name="businesses")
    op.drop_column("businesses", "last_contacted")
    op.drop_column("businesses", "contact_status")
    op.drop_column("businesses", "lead_score")
    op.drop_column("businesses", "website_status")
    op.drop_column("businesses", "email")
