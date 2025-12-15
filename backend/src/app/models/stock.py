from datetime import UTC, datetime
from enum import Enum
from functools import partial

from sqlmodel import Field, Relationship, SQLModel


class ChangeType(str, Enum):
    """Type of price change."""

    INITIAL = "initial"
    SWIPE_UP = "swipe_up"
    SWIPE_DOWN = "swipe_down"
    RANDOM = "random"
    ADMIN = "admin"


class StockPrice(SQLModel, table=True):
    """Price entry for a stock."""

    __tablename__ = "stock_price"  # pyright: ignore[reportAssignmentType]

    id: int | None = Field(default=None, primary_key=True)
    ticker: str = Field(foreign_key="stock.ticker", index=True)
    price: float
    change_type: ChangeType = Field(default=ChangeType.ADMIN)
    created_at: datetime = Field(default_factory=partial(datetime.now, UTC))

    stock: "Stock" = Relationship(back_populates="prices")  # pyright: ignore[reportAny]  # noqa: UP037


class Stock(SQLModel, table=True):
    """Stock database model."""

    ticker: str = Field(max_length=4, primary_key=True)
    title: str = Field(max_length=100)
    image: str | None = None
    description: str = ""
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=partial(datetime.now, UTC))
    updated_at: datetime = Field(default_factory=partial(datetime.now, UTC))

    prices: list[StockPrice] = Relationship(  # pyright: ignore[reportAny]
        back_populates="stock",
        sa_relationship_kwargs={
            "lazy": "selectin",
            "order_by": "StockPrice.created_at.desc()",
        },
    )

    @property
    def price(self) -> float:
        """Get current price from latest StockPrice entry."""
        if self.prices:
            return self.prices[0].price
        return 100.0

    @property
    def initial_price(self) -> float:
        """Get initial price from first StockPrice entry."""
        if self.prices:
            return self.prices[-1].price
        return 100.0
