from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlmodel import select
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


@router.get("/")
async def list_stocks(session: AsyncSession = Depends(get_session)) -> list[StockResponse]:
    """Get all stocks."""
    result = await session.exec(select(Stock))
    stocks = result.all()
    logger.debug("Listed {} stocks", len(stocks))
    return [StockResponse.model_validate(s) for s in stocks]


@router.post("/")
async def create_stock(
    request: StockCreate, session: AsyncSession = Depends(get_session)
) -> StockResponse:
    """Create a new stock (person)."""
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

    logger.info("Created stock {} ({})", ticker, request.nickname)
    return StockResponse.model_validate(stock)


@router.get("/{ticker}")
async def get_stock(ticker: str, session: AsyncSession = Depends(get_session)) -> StockResponse:
    """Get a single stock by ticker."""
    stock = await session.get(Stock, ticker)
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")
    return StockResponse.model_validate(stock)
