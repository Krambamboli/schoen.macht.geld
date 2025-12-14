from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.stock import PriceHistory, Stock
from app.schemas.stock import StockResponse, SwipeRequest

router = APIRouter()

SWIPE_VALUE = 0.1  # Value change per swipe


@router.post("/", response_model=StockResponse)
async def swipe(request: SwipeRequest, session: AsyncSession = Depends(get_session)):
    """Record a swipe and update stock value."""
    stock = await session.get(Stock, request.ticker)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Calculate value change
    if request.direction == "right":
        delta = SWIPE_VALUE
    elif request.direction == "left":
        delta = -SWIPE_VALUE
    else:
        raise HTTPException(status_code=400, detail="Direction must be 'left' or 'right'")

    # Update stock value
    stock.current_value += delta
    stock.updated_at = datetime.utcnow()

    # Record price history
    history_entry = PriceHistory(
        ticker=stock.ticker,
        value=stock.current_value,
        timestamp=datetime.utcnow(),
    )
    session.add(history_entry)

    session.add(stock)
    await session.commit()
    await session.refresh(stock)

    return StockResponse.model_validate(stock)
