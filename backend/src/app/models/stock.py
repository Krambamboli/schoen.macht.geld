from datetime import UTC, datetime
from enum import Enum
from functools import partial

from fastapi_storages import FileSystemStorage  # pyright: ignore[reportMissingTypeStubs]
from fastapi_storages.base import StorageImage  # pyright: ignore[reportMissingTypeStubs]
from fastapi_storages.integrations.sqlalchemy import ImageType  # pyright: ignore[reportMissingTypeStubs]
from sqlmodel import Column, Field, Relationship, SQLModel
from sqlmodel._compat import SQLModelConfig

from app.config import settings


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

    __tablename__ = "stock"  # pyright: ignore[reportAssignmentType]
    model_config = SQLModelConfig(from_attributes=True, arbitrary_types_allowed=True)  # pyright: ignore[reportCallIssue]

    ticker: str = Field(max_length=4, primary_key=True)
    title: str = Field(max_length=100)
    image: StorageImage | None = Field(sa_column=Column(ImageType(storage=FileSystemStorage(path=settings.image_dir))))
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
        return settings.base_price
