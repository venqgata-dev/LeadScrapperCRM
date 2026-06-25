"""sales crm — call logs, notes history, deal fields

Revision ID: 202606240002
Revises: 202606240001
Create Date: 2026-06-24 12:00:00.000000

Additive only — no columns dropped, no tables dropped.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606240002"
down_revision: str | None = "202606240001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # New columns on businesses                                            #
    # ------------------------------------------------------------------ #
    op.add_column("businesses", sa.Column("deal_value", sa.Numeric(10, 2), nullable=True))
    op.add_column("businesses", sa.Column("follow_up_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("businesses", sa.Column("proposal_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("businesses", sa.Column("called_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("businesses", sa.Column("won_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_businesses_follow_up_date", "businesses", ["follow_up_date"], unique=False)
    op.create_index("ix_businesses_deal_value", "businesses", ["deal_value"], unique=False)

    # ------------------------------------------------------------------ #
    # call_logs table                                                       #
    # ------------------------------------------------------------------ #
    op.create_table(
        "call_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("called_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("outcome", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_call_logs_business_id", "call_logs", ["business_id"], unique=False)
    op.create_index("ix_call_logs_called_at", "call_logs", ["called_at"], unique=False)

    # ------------------------------------------------------------------ #
    # business_notes table                                                  #
    # ------------------------------------------------------------------ #
    op.create_table(
        "business_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_business_notes_business_id", "business_notes", ["business_id"], unique=False)
    op.create_index("ix_business_notes_created_at", "business_notes", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("business_notes")
    op.drop_table("call_logs")
    op.drop_index("ix_businesses_deal_value", table_name="businesses")
    op.drop_index("ix_businesses_follow_up_date", table_name="businesses")
    op.drop_column("businesses", "won_at")
    op.drop_column("businesses", "called_at")
    op.drop_column("businesses", "proposal_sent_at")
    op.drop_column("businesses", "follow_up_date")
    op.drop_column("businesses", "deal_value")
