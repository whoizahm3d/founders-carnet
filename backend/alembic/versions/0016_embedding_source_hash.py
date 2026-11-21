"""Track profile embedding source text hashes for safe regeneration."""

import sqlalchemy as sa

from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ecosystem_profiles", sa.Column("source_hash", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("ecosystem_profiles", "source_hash")
