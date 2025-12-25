import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.stock import ChangeType, PriceEvent, Stock
from app.schemas.stock import SwipeDirection, SwipeResponse
from app.swipe_token import SwipeToken, calculate_price_delta
from app.websocket import manager as ws_manager

router = APIRouter()

# Per-ticker locks to prevent race conditions on concurrent swipes
# This ensures swipes on the same stock are serialized, while swipes on
# different stocks can proceed concurrently.
_ticker_locks: dict[str, asyncio.Lock] = {}


def _get_ticker_lock(ticker: str) -> asyncio.Lock:
    """Get or create a lock for the given ticker."""
    if ticker not in _ticker_locks:
        _ticker_locks[ticker] = asyncio.Lock()
    return _ticker_locks[ticker]


@router.post("/")
async def swipe(
    ticker: str,
    direction: SwipeDirection,
    token: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> SwipeResponse:
    """Record a swipe and update stock value.

    Uses per-ticker locking to prevent race conditions when multiple users
    swipe the same stock simultaneously.
    """
    # Decode/create swipe token and update with this swipe (outside lock, no DB)
    tok = SwipeToken.decode(token)
    tok.update(direction)
    stats = tok.analyze()

    # Acquire lock for this ticker to serialize concurrent swipes on same stock
    lock = _get_ticker_lock(ticker)
    async with lock:
        # Read stock inside lock to get current price
        stock = await session.get(Stock, ticker)
        if not stock:
            logger.warning("Swipe on unknown ticker: {}", ticker)
            raise HTTPException(status_code=404, detail="Stock not found")

        ticker = stock.ticker

        # Calculate price delta based on direction and user stats
        delta = calculate_price_delta(stock.price, direction, stats)

        # Calculate new price (enforce >= 0)
        new_price = max(0.0, stock.price + delta)

        # Determine change type
        change_type = (
            ChangeType.SWIPE_UP
            if direction == SwipeDirection.RIGHT
            else ChangeType.SWIPE_DOWN
        )

        # Update stock price (denormalized for fast access)
        stock.price = new_price
        stock.updated_at = datetime.now(UTC)
        session.add(stock)

        # Record price event for history
        price_event = PriceEvent(
            ticker=ticker,
            price=new_price,
            change_type=change_type,
        )
        session.add(price_event)

        await session.commit()
        await session.refresh(stock)

        logger.debug(
            "{} {} -> {:.2f} (delta: {:.2f}, streak: {}, pickiness: {:.2f})",
            ticker,
            direction.value,
            new_price,
            delta,
            stats.streak_length,
            stats.pickiness_ratio,
        )

        # Broadcast stock update via WebSocket
        await ws_manager.broadcast_stock_update(stock)

        return SwipeResponse(
            ticker=ticker,
            new_price=new_price,
            delta=delta,
            token=tok.encode(),
        )
