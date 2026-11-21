"""Support report/block kinds and talent profiles without SECP data (FR-16)."""

from alembic import op
import sqlalchemy as sa


revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("profile_verifications") as batch:
        batch.alter_column(
            "secp_entity_name",
            existing_type=sa.String(length=255),
            nullable=True,
        )
        batch.alter_column(
            "secp_registration_number",
            existing_type=sa.String(length=100),
            nullable=True,
        )
    with op.batch_alter_table("profile_reports") as batch:
        batch.add_column(
            sa.Column("kind", sa.String(length=20), server_default="report", nullable=False)
        )
        batch.create_check_constraint("ck_profile_reports_kind", "kind IN ('report', 'block')")


def downgrade() -> None:
    with op.batch_alter_table("profile_reports") as batch:
        batch.drop_constraint("ck_profile_reports_kind", type_="check")
        batch.drop_column("kind")
    with op.batch_alter_table("profile_verifications") as batch:
        batch.alter_column(
            "secp_entity_name",
            existing_type=sa.String(length=255),
            nullable=False,
        )
        batch.alter_column(
            "secp_registration_number",
            existing_type=sa.String(length=100),
            nullable=False,
        )
