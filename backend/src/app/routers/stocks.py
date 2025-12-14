from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.stock import Stock
from app.schemas.stock import StockResponse

router = APIRouter()


@router.get("/", response_model=list[StockResponse])
async def list_stocks(session: AsyncSession = Depends(get_session)):
    """Get all stocks."""
    result = await session.exec(select(Stock))
    stocks = result.all()
    return [StockResponse.model_validate(s) for s in stocks]


@router.get("/{ticker}", response_model=StockResponse)
async def get_stock(ticker: str, session: AsyncSession = Depends(get_session)):
    """Get a single stock by ticker."""
    stock = await session.get(Stock, ticker)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return StockResponse.model_validate(stock)
