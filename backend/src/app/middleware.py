"""Middleware for request timing and SQL query logging."""

import time
from collections.abc import Awaitable, Callable
from typing import override

from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import get_query_stats, reset_query_stats


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to log request timing and SQL query statistics."""

    @override
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # Skip static files and admin
        if request.url.path.startswith("/static") or request.url.path.startswith(
            "/admin"
        ):
            return await call_next(request)

        # Reset query stats for this request
        reset_query_stats()

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Get query stats
        queries, db_time = get_query_stats()
        db_time_ms = db_time * 1000

        # Log slow requests (>100ms) or requests with many queries (>5)
        if duration_ms > 100 or queries > 5:
            logger.warning(
                "{} {} - {:.1f}ms total, {:.1f}ms DB, {} queries",
                request.method,
                request.url.path,
                duration_ms,
                db_time_ms,
                queries,
            )
        else:
            logger.debug(
                "{} {} - {:.1f}ms total, {:.1f}ms DB, {} queries",
                request.method,
                request.url.path,
                duration_ms,
                db_time_ms,
                queries,
            )

        # Add timing headers for debugging
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.1f}"
        response.headers["X-DB-Queries"] = str(queries)
        response.headers["X-DB-Time-Ms"] = f"{db_time_ms:.1f}"

        return response
