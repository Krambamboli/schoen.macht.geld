import time
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
)

# Shared query stats - simple list to accumulate across threads
# Format: [query_count, total_time]
_query_stats: list[float] = [0, 0.0]


def reset_query_stats() -> None:
    """Reset query stats before a request."""
    _query_stats[0] = 0
    _query_stats[1] = 0.0


def get_query_stats() -> tuple[int, float]:
    """Get current query stats."""
    return int(_query_stats[0]), _query_stats[1]


# SQL query timing and counting using connection-level events
@event.listens_for(engine.sync_engine, "before_execute")
def before_execute(
    conn: Connection,
    clauseelement: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    multiparams: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    params: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    execution_options: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
) -> None:
    """Record query start time."""
    conn.info["query_start_time"] = time.perf_counter()


@event.listens_for(engine.sync_engine, "after_execute")
def after_execute(
    conn: Connection,
    clauseelement: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    multiparams: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    params: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    execution_options: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
    result: Any,  # pyright: ignore[reportAny, reportExplicitAny, reportUnusedParameter]
) -> None:
    """Count query and accumulate time."""
    _query_stats[0] += 1
    start = conn.info.get("query_start_time")
    if start:
        _query_stats[1] += time.perf_counter() - start


async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db() -> None:
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Dependency that provides an async database session."""
    async with AsyncSession(engine) as session:
        yield session
