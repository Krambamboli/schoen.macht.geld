from datetime import datetime

from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict, computed_field

from app.models.stock import ChangeType


class StockPriceResponse(BaseModel):
    """Stock price entry for API response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    price: float
    change_type: ChangeType
    created_at: datetime


class StockResponse(BaseModel):
    """Stock response matching frontend interface."""

    model_config = ConfigDict(from_attributes=True)

    ticker: str
    title: str
    image: str | None
    description: str
    is_active: bool
    price: float
    prices: list[StockPriceResponse] = []
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def initial_price(self) -> float:
        """Get initial price from first entry."""
        if self.prices:
            return self.prices[-1].price
        return 100.0

    @computed_field
    @property
    def change(self) -> float:
        """Absolute change from initial price."""
        return self.price - self.initial_price

    @computed_field
    @property
    def percent_change(self) -> float:
        """Percentage change from initial price."""
        if self.initial_price == 0:
            return 0.0
        return (self.change / self.initial_price) * 100


class StockCreate(BaseModel):
    """Schema for creating a stock."""

    title: str
    image: str | None = None
    description: str = ""
    initial_price: float = 100.0


class StockPriceUpdate(BaseModel):
    """Schema for manipulating stock price."""

    delta: float
    change_type: ChangeType = ChangeType.ADMIN


class StockImageUpdate(UploadFile):
    pass


class SwipeRequest(BaseModel):
    """Schema for a swipe action."""

    ticker: str
    direction: str  # "left" or "right"
