from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.stock import Stock
from app.schemas.stock import StockCreate, StockResponse

router = APIRouter()


def generate_ticker(nickname: str) -> str:
    """Generate a 4-char ticker from nickname."""
    # Take first 4 chars, uppercase, pad with X if needed
    clean = "".join(c for c in nickname if c.isalpha()).upper()
    return (clean[:4]).ljust(4, "X")


@router.post("/", response_model=StockResponse)
async def register_stock(
    request: StockCreate, session: AsyncSession = Depends(get_session)
):
    """Register a new stock (person)."""
    ticker = generate_ticker(request.nickname)

    # Check if ticker already exists
    existing = await session.get(Stock, ticker)
    if existing:
        logger.warning("Ticker {} already exists", ticker)
        raise HTTPException(
            status_code=400, detail=f"Ticker {ticker} already exists"
        )

    stock = Stock(
        ticker=ticker,
        nickname=request.nickname,
        photo_url=request.photo_url,
        description=request.description,
    )

    session.add(stock)
    await session.commit()
    await session.refresh(stock)

    logger.info("Registered stock {} ({})", ticker, request.nickname)
    return StockResponse.model_validate(stock)
