"""Add the founder startup verification review queue (FR-24)."""

from alembic import op
import sqlalchemy as sa


revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "startup_verification_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("startup_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="ck_startup_verification_status"),
        sa.ForeignKeyConstraint(["startup_id"], ["startups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_startup_verification_one_open",
        "startup_verification_requests",
        ["startup_id"],
        unique=True,
        sqlite_where=sa.text("status = 'pending'"),
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "ix_startup_verification_status_created",
        "startup_verification_requests",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_startup_verification_status_created", table_name="startup_verification_requests")
    op.drop_index("uq_startup_verification_one_open", table_name="startup_verification_requests")
    op.drop_table("startup_verification_requests")
