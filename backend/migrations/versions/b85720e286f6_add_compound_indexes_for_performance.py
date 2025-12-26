"""add compound indexes for performance

Revision ID: b85720e286f6
Revises: 1d2e35a2d7a6
Create Date: 2025-12-24 13:25:52.719710

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b85720e286f6"
down_revision: Union[str, Sequence[str], None] = "1d2e35a2d7a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Compound index for fetching latest price_event per ticker
    # Used by list_stocks and headlines endpoints
    op.create_index(
        "ix_price_event_ticker_created_at",
        "price_event",
        ["ticker", sa.text("created_at DESC")],
    )

    # Compound index for fetching latest snapshots per ticker
    # Used by snapshot cleanup and graph queries
    op.create_index(
        "ix_stock_snapshot_ticker_created_at",
        "stock_snapshot",
        ["ticker", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_stock_snapshot_ticker_created_at", table_name="stock_snapshot")
    op.drop_index("ix_price_event_ticker_created_at", table_name="price_event")
