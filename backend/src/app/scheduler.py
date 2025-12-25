import random
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from functools import wraps
from pathlib import Path
from typing import ParamSpec, TypeVar

from apscheduler.schedulers.asyncio import (  # pyright: ignore[reportMissingTypeStubs]
    AsyncIOScheduler,
)
from loguru import logger
from sqlalchemy import delete, func
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import async_session_maker, get_query_stats, reset_query_stats
from app.models.ai_task import AITask, TaskStatus, TaskType
from app.models.stock import ChangeType, PriceEvent, Stock, StockSnapshot
from app.services.ai import AIError, ai
from app.websocket import manager as ws_manager

scheduler = AsyncIOScheduler()

P = ParamSpec("P")
R = TypeVar("R")


def timed_task[**P, R](
    func: Callable[P, Awaitable[R]],
) -> Callable[P, Awaitable[R]]:
    """Decorator to log timing and query stats for scheduler tasks."""

    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        reset_query_stats()
        start = time.perf_counter()
        try:
            return await func(*args, **kwargs)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            queries, db_time = get_query_stats()
            db_time_ms = db_time * 1000
            if duration_ms > 100 or queries > 10:
                logger.warning(
                    "[{}] {:.1f}ms total, {:.1f}ms DB, {} queries",
                    func.__name__,
                    duration_ms,
                    db_time_ms,
                    queries,
                )
            else:
                logger.debug(
                    "[{}] {:.1f}ms total, {:.1f}ms DB, {} queries",
                    func.__name__,
                    duration_ms,
                    db_time_ms,
                    queries,
                )

    return wrapper


AI_IMAGE_DIR = "ai_images"
AI_VIDEO_DIR = "ai_videos"


@timed_task
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

            # Update stock price (denormalized for fast access)
            stock.price = new_price
            stock.updated_at = datetime.now(UTC)
            session.add(stock)

            # Record price event for history
            price_event = PriceEvent(
                ticker=stock.ticker,
                price=new_price,
                change_type=ChangeType.RANDOM,
            )
            session.add(price_event)

        await session.commit()
        logger.debug("Ticked prices for {} stocks", len(stocks))

        # Broadcast updated stocks via WebSocket
        await ws_manager.broadcast_stocks_update(list(stocks))


@timed_task
async def snapshot_prices() -> None:
    """Take price snapshots for all active stocks.

    Updates reference_price for percentage change calculation,
    creates StockSnapshot entries for graph history,
    and calculates rankings.
    """
    async with async_session_maker() as session:
        result = await session.exec(select(Stock).where(Stock.is_active == True))  # noqa: E712
        stocks = list(result.all())

        if not stocks:
            logger.debug("No active stocks to snapshot")
            return

        # Capture previous state for event detection
        previous_stocks = {s.ticker: Stock.model_validate(s) for s in stocks}

        now = datetime.now(UTC)

        # Calculate rankings before updating reference prices
        _update_rankings(stocks)

        for stock in stocks:
            # Update reference price for percentage change calculation
            stock.reference_price = stock.price
            stock.reference_price_at = now
            session.add(stock)

            # Create snapshot for graph history
            snapshot = StockSnapshot(
                ticker=stock.ticker,
                price=stock.price,
            )
            session.add(snapshot)

        await session.commit()
        logger.debug("Created snapshots for {} stocks", len(stocks))

        # Broadcast updated stocks via WebSocket
        await ws_manager.broadcast_stocks_update(stocks)

        # Detect and broadcast market events
        await ws_manager.detect_and_broadcast_events(stocks, previous_stocks)

        # Cleanup old snapshots
        await _cleanup_old_snapshots(session)


def _update_rankings(stocks: list[Stock]) -> None:
    """Calculate and update rankings for all stocks."""
    # Save current ranks as previous ranks
    for stock in stocks:
        stock.previous_rank = stock.rank
        stock.previous_change_rank = stock.change_rank

    # Rank by price (descending - highest price = rank 1)
    stocks_by_price = sorted(stocks, key=lambda s: s.price, reverse=True)
    for i, stock in enumerate(stocks_by_price, start=1):
        stock.rank = i

    # Rank by percentage change (descending - highest gain = rank 1)
    # Stocks without percentage_change go last
    def change_sort_key(s: Stock) -> tuple[int, float]:
        pct = s.percentage_change
        if pct is None:
            return (1, 0.0)  # No change = sort last
        return (0, -pct)  # Has change = sort by change descending

    stocks_by_change = sorted(stocks, key=change_sort_key)
    for i, stock in enumerate(stocks_by_change, start=1):
        stock.change_rank = i


async def _cleanup_old_snapshots(session: AsyncSession) -> None:
    """Remove snapshots beyond retention limit for each stock.

    Uses window function to identify IDs to keep in one query, then bulk deletes.
    """
    retention = settings.snapshot_retention

    # Subquery: rank snapshots per ticker by created_at DESC, keep top N
    ranked = select(
        StockSnapshot.id,
        func.row_number()
        .over(
            partition_by=StockSnapshot.ticker,
            order_by=col(StockSnapshot.created_at).desc(),
        )
        .label("rn"),
    ).subquery()

    # Get IDs to keep (rank <= retention)
    keep_ids_query = select(ranked.c.id).where(ranked.c.rn <= retention)

    # Delete all snapshots not in the keep list
    delete_stmt = delete(StockSnapshot).where(
        col(StockSnapshot.id).notin_(keep_ids_query)
    )
    result = await session.exec(delete_stmt)  # type: ignore[arg-type]

    if result.rowcount and result.rowcount > 0:  # type: ignore[union-attr]
        await session.commit()
        logger.debug("Cleaned up {} old snapshots", result.rowcount)


@timed_task
async def process_ai_tasks() -> None:
    """Process pending and in-progress AI tasks."""
    async with async_session_maker() as session:
        # Get pending and processing tasks
        result = await session.exec(
            select(AITask).where(
                col(AITask.status).in_([TaskStatus.PENDING, TaskStatus.PROCESSING])
            )
        )
        tasks = result.all()

        if not tasks:
            return

        for task in tasks:
            try:
                if task.status == TaskStatus.PENDING:
                    await _submit_task(task, session)
                elif task.status == TaskStatus.PROCESSING:
                    await _poll_task(task, session)
            except AIError as e:
                # AI provider error (all providers failed)
                logger.error("AI error for task {}: {}", task.id, e)
                task.status = TaskStatus.FAILED
                task.error = str(e)
                task.completed_at = datetime.now(UTC)
                session.add(task)
            except OSError as e:
                # File I/O errors (downloading results, etc.)
                logger.error("I/O error for task {}: {}", task.id, e)
                task.status = TaskStatus.FAILED
                task.error = f"I/O error: {e}"
                task.completed_at = datetime.now(UTC)
                session.add(task)

        await session.commit()


async def _submit_task(task: AITask, session: AsyncSession) -> None:
    """Submit a pending task to the AI service."""
    logger.info("Submitting {} task {}", task.task_type.value, task.id)

    if task.task_type == TaskType.DESCRIPTION:
        # Text generation is synchronous (fast)
        content = await ai.generate_text(task.prompt, model=task.model)
        task.result = content.strip()
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(UTC)
        logger.info("Completed text task {}", task.id)

    elif task.task_type == TaskType.IMAGE:
        task.atlascloud_id = await ai.generate_image(
            task.prompt, model=task.model, **task.arguments
        )
        task.status = TaskStatus.PROCESSING
        logger.info(
            "Started image task {}, atlascloud_id={}", task.id, task.atlascloud_id
        )

    elif task.task_type == TaskType.VIDEO:
        task.atlascloud_id = await ai.generate_video_from_text(
            task.prompt, model=task.model, **task.arguments
        )
        task.status = TaskStatus.PROCESSING
        logger.info(
            "Started video task {}, atlascloud_id={}", task.id, task.atlascloud_id
        )
    session.add(task)


async def _poll_task(task: AITask, session: AsyncSession) -> None:
    """Poll a processing task for completion."""
    if not task.atlascloud_id:
        logger.warning("Task {} has no atlascloud_id, marking failed", task.id)
        task.status = TaskStatus.FAILED
        task.error = "No external task ID"
        session.add(task)
        return

    # Check timeout (handle both naive and aware datetimes)
    now = datetime.now(UTC)
    created = task.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    elapsed = (now - created).total_seconds()
    if elapsed > settings.ai_task_timeout:
        logger.warning("Task {} timed out after {}s", task.id, elapsed)
        task.status = TaskStatus.FAILED
        task.error = "Task timed out"
        task.completed_at = datetime.now(UTC)
        session.add(task)
        return

    status, outputs, error = await ai.get_task_status(task.atlascloud_id)

    if status == "completed":
        # Download and save the result
        if outputs:
            task.result = await _download_result(
                task, outputs[0]
            )  # TODO(mg): Add support for multiple outputs
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(UTC)
        logger.info("Task {} completed: {}", task.id, task.result)

    elif status == "failed":
        task.status = TaskStatus.FAILED
        task.error = error
        task.completed_at = datetime.now(UTC)
        logger.error("Task {} failed: {}", task.id, task.error)

    # else: still processing, do nothing

    session.add(task)


async def _download_result(task: AITask, url: str) -> str | None:
    """Download generated media and save locally."""
    # Determine directory & file extension
    static_path = Path(settings.static_dir)
    if task.task_type == TaskType.IMAGE:
        ext = ".png"
        dl_path = static_path / AI_IMAGE_DIR
    elif task.task_type == TaskType.VIDEO:
        ext = ".mp4"
        dl_path = static_path / AI_VIDEO_DIR
    else:
        return None

    # Download file
    content = await ai.download_file(url)

    # Save with task ID as filename
    filename = f"{task.id}{ext}"
    filepath = dl_path / filename
    _ = filepath.write_bytes(content)
    logger.info("Downloaded {} to {}", task.task_type.value, filepath)
    return str(filepath)


def start_scheduler() -> None:
    """Start the background scheduler."""
    if settings.price_tick_enabled:
        _ = scheduler.add_job(  # pyright: ignore[reportUnknownMemberType]
            tick_prices,
            "interval",
            seconds=settings.price_tick_interval,
            id="price_tick",
            replace_existing=True,
        )
        logger.info(
            "Started price tick scheduler (interval: {}s)", settings.price_tick_interval
        )

    # Price snapshots for graphs and percentage change
    _ = scheduler.add_job(  # pyright: ignore[reportUnknownMemberType]
        snapshot_prices,
        "interval",
        seconds=settings.snapshot_interval,
        id="price_snapshot",
        replace_existing=True,
    )
    logger.info(
        "Started snapshot scheduler (interval: {}s, retention: {})",
        settings.snapshot_interval,
        settings.snapshot_retention,
    )

    # AI task processor - enabled if any AI provider is configured
    if ai.is_configured():
        _ = scheduler.add_job(  # pyright: ignore[reportUnknownMemberType]
            process_ai_tasks,
            "interval",
            seconds=settings.ai_task_poll_interval,
            id="ai_task_processor",
            replace_existing=True,
        )
        logger.info(
            "Started AI task processor (interval: {}s, provider: {})",
            settings.ai_task_poll_interval,
            ai.text_provider(),
        )
    else:
        logger.warning("No AI API key configured, AI task processor disabled")

    if scheduler.get_jobs():  # pyright: ignore[reportUnknownMemberType]
        scheduler.start()


def stop_scheduler() -> None:
    """Stop the background scheduler gracefully.

    Waits for currently running jobs to complete before shutting down.
    """
    if scheduler.running:
        logger.info("Stopping scheduler, waiting for running jobs to complete...")
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
