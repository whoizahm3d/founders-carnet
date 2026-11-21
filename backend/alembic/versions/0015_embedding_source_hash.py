"""Track profile embedding source text hashes for safe regeneration."""

from alembic import op
import sqlalchemy as sa


revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ecosystem_profiles", sa.Column("source_hash", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("ecosystem_profiles", "source_hash")
