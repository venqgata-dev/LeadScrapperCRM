"""AI Outreach & Sales Automation Engine.

Revision ID: 202606300001
Revises: 202606290001
Create Date: 2026-06-30
"""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision = "202606300001"
down_revision = "202606290001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sales_campaigns",
        sa.Column("id",                  sa.Integer(),     primary_key=True),
        sa.Column("name",                sa.String(255),   nullable=False),
        sa.Column("description",         sa.Text(),        nullable=True),
        sa.Column("campaign_type",       sa.String(30),    nullable=False, server_default="MIXED"),
        sa.Column("status",              sa.String(20),    nullable=False, server_default="DRAFT"),
        sa.Column("country",             sa.String(120),   nullable=True),
        sa.Column("category",            sa.String(120),   nullable=True),
        sa.Column("min_ai_score",        sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("min_project_value",   sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("min_close_probability", sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("target_count",        sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("contacted_count",     sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("replied_count",       sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("booked_count",        sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("created_at",          sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at",          sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sales_campaigns_status", "sales_campaigns", ["status"])

    op.create_table(
        "sales_tasks",
        sa.Column("id",          sa.Integer(),  primary_key=True),
        sa.Column("campaign_id", sa.Integer(),  sa.ForeignKey("sales_campaigns.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("business_id", sa.Integer(),  sa.ForeignKey("businesses.id", ondelete="CASCADE"),       nullable=False, index=True),
        sa.Column("task_type",   sa.String(30), nullable=False, server_default="CALL"),
        sa.Column("status",      sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("priority",    sa.Integer(),  nullable=False, server_default="5"),
        sa.Column("due_date",    sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes",       sa.Text(),     nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sales_tasks_status_due", "sales_tasks", ["status", "due_date"])

    op.create_table(
        "email_templates",
        sa.Column("id",               sa.Integer(),  primary_key=True),
        sa.Column("name",             sa.String(255), nullable=False),
        sa.Column("template_type",    sa.String(50),  nullable=False, server_default="GENERIC"),
        sa.Column("subject_template", sa.Text(),      nullable=False),
        sa.Column("body_template",    sa.Text(),      nullable=False),
        sa.Column("is_active",        sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at",       sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "call_scripts",
        sa.Column("id",                sa.Integer(), primary_key=True),
        sa.Column("business_id",       sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("script_text",       sa.Text(),    nullable=False),
        sa.Column("opening_line",      sa.Text(),    nullable=True),
        sa.Column("pain_point_hook",   sa.Text(),    nullable=True),
        sa.Column("value_proposition", sa.Text(),    nullable=True),
        sa.Column("call_to_action",    sa.Text(),    nullable=True),
        sa.Column("generated_at",      sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at",        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    op.create_table(
        "follow_ups",
        sa.Column("id",              sa.Integer(),  primary_key=True),
        sa.Column("business_id",     sa.Integer(),  sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("task_id",         sa.Integer(),  sa.ForeignKey("sales_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("follow_up_type",  sa.String(30), nullable=False, server_default="CALLBACK"),
        sa.Column("scheduled_for",   sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("status",          sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("notes",           sa.Text(),     nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "email_history",
        sa.Column("id",          sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject",     sa.Text(),    nullable=False),
        sa.Column("body",        sa.Text(),    nullable=False),
        sa.Column("status",      sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("sent_at",     sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "outreach_calls",
        sa.Column("id",             sa.Integer(), primary_key=True),
        sa.Column("business_id",    sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("script_id",      sa.Integer(), sa.ForeignKey("call_scripts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("outcome",        sa.String(20), nullable=True),
        sa.Column("notes",          sa.Text(),    nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("called_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column("created_at",     sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    for t in ("outreach_calls", "email_history", "follow_ups", "call_scripts", "email_templates", "sales_tasks", "sales_campaigns"):
        op.drop_table(t)
