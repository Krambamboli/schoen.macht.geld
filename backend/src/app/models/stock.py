from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel


class PriceHistory(SQLModel, table=True):
    """Price history entry for a stock."""

    __tablename__ = "price_history"

    ticker: str = Field(foreign_key="stock.ticker", primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, primary_key=True)
    value: float

    stock: "Stock" = Relationship(back_populates="history")


class Stock(SQLModel, table=True):
    """Stock database model."""

    ticker: str = Field(max_length=4, primary_key=True)
    nickname: str = Field(max_length=100)
    photo_url: str
    description: str = ""

    current_value: float = Field(default=100.0)
    initial_value: float = Field(default=100.0)

    rank: int | None = None
    previous_rank: int | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    history: list[PriceHistory] = Relationship(
        back_populates="stock",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
