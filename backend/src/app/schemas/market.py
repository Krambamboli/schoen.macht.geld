from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MarketStateResponse(BaseModel):
    """Market state response for API."""

    model_config = ConfigDict(from_attributes=True)

    is_open: bool
    snapshot_count: int
    market_day_count: int
    updated_at: datetime