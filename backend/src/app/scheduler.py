import random
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # pyright: ignore[reportMissingTypeStubs]
from loguru import logger
from sqlmodel import select

from app.config import settings
from app.database import async_session_maker
from app.models.stock import ChangeType, Stock, StockPrice

scheduler = AsyncIOScheduler()


async def tick_prices() -> None:
    """Apply random price changes to all active stocks."""
    async with async_session_maker() as session:
        result = await session.exec(select(Stock).where(Stock.is_active == True))  # noqa: E712
        stocks = result.all()

        if not stocks:
            logger.debug("No active stocks to tick")
            return

        for stock in stocks:
            # Random delta between -5% and +5% of current price
            max_delta = stock.price * 0.05
            delta = random.uniform(-max_delta, max_delta)

            # Enforce price >= 0
            new_price = max(0.0, stock.price + delta)

            price_entry = StockPrice(
                ticker=stock.ticker,
                price=new_price,
                change_type=ChangeType.RANDOM,
            )
            session.add(price_entry)

            stock.updated_at = datetime.now(UTC)
            session.add(stock)

        await session.commit()
        logger.debug("Ticked prices for {} stocks", len(stocks))


def start_scheduler() -> None:
    """Start the background scheduler."""
    if not settings.price_tick_enabled:
        logger.info("Price tick scheduler disabled")
        return

    _ = scheduler.add_job(  # pyright: ignore[reportUnknownMemberType]
        tick_prices,
        "interval",
        seconds=settings.price_tick_interval,
        id="price_tick",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Started price tick scheduler (interval: {}s)", settings.price_tick_interval
    )


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Stopped price tick scheduler")
