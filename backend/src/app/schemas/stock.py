from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PriceHistoryResponse(BaseModel):
    """Price history entry for API response."""

    model_config = ConfigDict(from_attributes=True)

    value: float
    timestamp: datetime


class StockResponse(BaseModel):
    """Stock response matching frontend interface."""

    model_config = ConfigDict(from_attributes=True)

    ticker: str
    nickname: str
    photo_url: str
    description: str
    current_value: float
    initial_value: float
    rank: int | None = None
    previous_rank: int | None = None
    history: list[PriceHistoryResponse] = []

    # Computed fields for frontend compatibility
    change: float = 0.0
    percent_change: float = 0.0
    value_change_last_minute: float = 0.0
    value_change_last_5_minutes: float = 0.0
    percent_change_last_5_minutes: float = 0.0


class StockCreate(BaseModel):
    """Schema for creating a stock."""

    nickname: str
    photo_url: str
    description: str = ""


class SwipeRequest(BaseModel):
    """Schema for a swipe action."""

    ticker: str
    direction: str  # "left" = -0.1, "right" = +0.1
