from datetime import UTC, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    Form,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from loguru import logger
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.stock import (
    ChangeType,
    PriceEvent,
    Stock,
    StockSnapshot,
)
from app.schemas.stock import (
    PriceEventResponse,
    StockOrder,
    StockResponse,
    StockSnapshotResponse,
)
from app.storage import cleanup_old_image, process_image, validate_image
from app.websocket import manager as ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time stock updates.

    Clients receive:
    - stocks_update: Full list of stocks after price tick/snapshot
    - stock_update: Single stock update after swipe
    - event: Market events (new_leader, all_time_high, big_crash)
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, wait for client messages (ping/pong)
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@router.get("/")
async def list_stocks(
    order: Annotated[StockOrder | None, Query()] = None,
    limit: Annotated[int | None, Query()] = None,
    session: AsyncSession = Depends(get_session),
) -> list[StockResponse]:
    """Get all stocks.

    Args:
        order: Ordering option (default, random, rank, rank_desc, created_at,
        created_at_desc, change_rank, change_rank_desc)
        limit: Maximum number of stocks to return
    """
    sel = select(Stock)

    # Apply ordering
    match order:
        case StockOrder.RANDOM:
            sel = sel.order_by(func.random())
        case StockOrder.RANK:
            sel = sel.order_by(col(Stock.rank).asc().nulls_last())
        case StockOrder.RANK_DESC:
            sel = sel.order_by(col(Stock.rank).desc().nulls_last())
        case StockOrder.CREATED_AT:
            sel = sel.order_by(col(Stock.created_at).asc())
        case StockOrder.CREATED_AT_DESC:
            sel = sel.order_by(col(Stock.created_at).desc())
        case StockOrder.CHANGE_RANK:
            sel = sel.order_by(col(Stock.change_rank).asc().nulls_last())
        case StockOrder.CHANGE_RANK_DESC:
            sel = sel.order_by(col(Stock.change_rank).desc().nulls_last())
        case _:
            pass  # Default: no ordering

    if limit:
        sel = sel.limit(limit)

    result = await session.exec(sel)
    stocks = list(result.all())

    logger.debug("Listed {} stocks (order={})", len(stocks), order)
    return [StockResponse.model_validate(s) for s in stocks]


@router.post("/")
async def create_stock(
    ticker: Annotated[str, Form()],
    title: Annotated[str, Form()],
    description: Annotated[str, Form()] = "",
    initial_price: Annotated[float | None, Form()] = None,
    session: AsyncSession = Depends(get_session),
    image: UploadFile | None = None,
) -> StockResponse:
    """Create a new stock."""
    ticker = ticker.upper().strip()

    if initial_price is None:
        initial_price = settings.stock_base_price

    # Validate ticker format
    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Ticker must be 1-10 characters")
    if not ticker.isalnum():
        raise HTTPException(
            status_code=400, detail="Ticker must contain only letters and numbers"
        )

    existing = await session.get(Stock, ticker)
    if existing:
        logger.warning("Ticker {} already exists", ticker)
        raise HTTPException(status_code=409, detail=f"Ticker '{ticker}' already exists")

    # Validate and process image if provided
    processed_image = None
    if image:
        validate_image(image)
        processed_image = await process_image(image)

    initial_price = max(0.0, initial_price)

    stock = Stock(
        ticker=ticker,
        title=title,
        image=processed_image,  # pyright: ignore[reportArgumentType]
        description=description,
        price=initial_price,
    )
    session.add(stock)

    # Create initial price event for history
    initial_event = PriceEvent(
        ticker=ticker,
        price=initial_price,
        change_type=ChangeType.INITIAL,
    )
    session.add(initial_event)

    await session.commit()
    await session.refresh(stock)

    logger.info("Created stock {} ({})", ticker, title)
    return StockResponse.model_validate(stock)


@router.get("/{ticker}")
async def get_stock(
    ticker: str, session: AsyncSession = Depends(get_session)
) -> StockResponse:
    """Get a single stock by ticker."""
    result = await session.exec(
        select(Stock)
        .where(Stock.ticker == ticker)
        .options(selectinload(Stock.price_events))  # pyright: ignore[reportArgumentType]
        .options(selectinload(Stock.snapshots))  # pyright: ignore[reportArgumentType]
    )
    stock = result.first()
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")

    # Limit to latest entries (already ordered DESC in model)
    stock.price_events = stock.price_events[:1] if stock.price_events else []
    stock.snapshots = stock.snapshots[:32] if stock.snapshots else []

    return StockResponse.model_validate(stock)


@router.post("/{ticker}/image")
async def upload_stock_image(
    ticker: str,
    image: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> StockResponse:
    """Upload and store stock image locally."""
    stock = await session.get(Stock, ticker)
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")

    # Validate and process image
    validate_image(image)
    processed_image = await process_image(image)

    # Clean up old image before replacing
    old_image = stock.image
    stock.image = processed_image  # pyright: ignore[reportAttributeAccessIssue]

    # Save stock
    stock.updated_at = datetime.now(UTC)
    session.add(stock)
    await session.commit()
    await session.refresh(stock)

    # Clean up old image after successful commit
    cleanup_old_image(old_image)

    logger.info(
        "Uploaded image for {}: {}",
        ticker,
        stock.image.path if stock.image else "<no image>",
    )
    return StockResponse.model_validate(stock)


@router.post("/{ticker}/price")
async def update_stock_price(
    ticker: str,
    price: Annotated[float, Body()],
    session: AsyncSession = Depends(get_session),
) -> StockResponse:
    """Manipulate stock price."""
    stock = await session.get(Stock, ticker)
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")

    # Calculate new price (enforce >= 0)
    new_price = max(0.0, price)

    # Update stock price (denormalized for fast access)
    stock.price = new_price
    stock.updated_at = datetime.now(UTC)

    # Track max/min prices for the session
    if stock.max_price is None or new_price > stock.max_price:
        stock.max_price = new_price
    if stock.min_price is None or new_price < stock.min_price:
        stock.min_price = new_price

    session.add(stock)

    # Create price event for history
    price_event = PriceEvent(
        ticker=ticker,
        price=new_price,
        change_type=ChangeType.ADMIN,
    )
    session.add(price_event)

    await session.commit()
    await session.refresh(stock)

    logger.debug(
        "{} price -> {:.2f}",
        ticker,
        new_price,
    )
    return StockResponse.model_validate(stock)


@router.get("/{ticker}/snapshots")
async def get_stock_snapshots(
    ticker: str,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    session: AsyncSession = Depends(get_session),
) -> list[StockSnapshotResponse]:
    """Get stock price snapshots for graphing."""
    stock = await session.get(Stock, ticker)
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")

    result = await session.exec(
        select(StockSnapshot)
        .where(StockSnapshot.ticker == ticker)
        .order_by(col(StockSnapshot.created_at).asc())
        .limit(limit)
    )
    snapshots = result.all()
    return [StockSnapshotResponse.model_validate(s) for s in snapshots]


@router.get("/{ticker}/events")
async def get_stock_events(
    ticker: str,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    session: AsyncSession = Depends(get_session),
) -> list[PriceEventResponse]:
    """Get price change events (activity log)."""
    stock = await session.get(Stock, ticker)
    if not stock:
        logger.warning("Stock not found: {}", ticker)
        raise HTTPException(status_code=404, detail="Stock not found")

    result = await session.exec(
        select(PriceEvent)
        .where(PriceEvent.ticker == ticker)
        .order_by(col(PriceEvent.created_at).desc())
        .limit(limit)
    )
    events = result.all()
    return [PriceEventResponse.model_validate(e) for e in events]
