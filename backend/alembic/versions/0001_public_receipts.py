"""public receipts only

Revision ID: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("public_receipts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("transaction_id", sa.String(180), nullable=False, unique=True), sa.Column("outcome", sa.Boolean(), nullable=False), sa.Column("disclosure_scope", sa.String(120), nullable=False), sa.Column("requirement_hash", sa.String(64), nullable=False))


def downgrade() -> None:
    op.drop_table("public_receipts")

