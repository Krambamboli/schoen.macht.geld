from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.stock import MarketState
from app.schemas.market import MarketStateResponse

router = APIRouter()


@router.get("/")
async def get_market_state(
    session: AsyncSession = Depends(get_session),
) -> MarketStateResponse:
    """Get current market state."""
    market_state = await session.get(MarketState, 1)

    if not market_state:
        # Return default closed state if not initialized
        return MarketStateResponse(
            is_open=False,
            snapshot_count=0,
            market_day_count=0,
            updated_at=datetime.now(),
        )

    return MarketStateResponse.model_validate(market_state)