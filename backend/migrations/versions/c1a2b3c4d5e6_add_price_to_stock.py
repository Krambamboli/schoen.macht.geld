"""add price to stock

Revision ID: c1a2b3c4d5e6
Revises: b85720e286f6
Create Date: 2025-12-24 16:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "b85720e286f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add price column to stock table and backfill from latest PriceEvent."""
    # Add column with default value
    op.add_column(
        "stock",
        sa.Column("price", sa.Float(), nullable=False, server_default="100.0"),
    )

    # Backfill from latest PriceEvent per stock
    # SQLite doesn't support UPDATE FROM, so we use a correlated subquery
    op.execute(
        """
        UPDATE stock
        SET price = (
            SELECT pe.price
            FROM price_event pe
            WHERE pe.ticker = stock.ticker
            ORDER BY pe.created_at DESC
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM price_event pe WHERE pe.ticker = stock.ticker
        )
        """
    )

    # Remove server default after backfill
    # op.alter_column("stock", "price", server_default=None)


def downgrade() -> None:
    """Remove price column from stock table."""
    op.drop_column("stock", "price")
