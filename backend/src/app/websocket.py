"""WebSocket connection manager for real-time stock updates."""

from fastapi import WebSocket
from loguru import logger

from app.models.stock import Stock
from app.schemas.stock import StockResponse

# Event detection thresholds
CRASH_THRESHOLD = -10.0  # Trigger crash event at -10% or worse


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []
        # State for event detection
        self._previous_leader: str | None = None
        self._highest_prices: dict[str, float] = {}

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket connected. Total: {}", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("WebSocket disconnected. Total: {}", len(self.active_connections))

    async def broadcast(self, message: dict[str, object]) -> None:
        """Broadcast a message to all connected clients."""
        if not self.active_connections:
            logger.debug("No WebSocket connections to broadcast to")
            return

        msg_type = message.get("type", "unknown")
        logger.debug(
            "Broadcasting {} to {} clients", msg_type, len(self.active_connections)
        )

        dead: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning("Failed to send to WebSocket: {}", e)
                dead.append(connection)

        # Remove dead connections
        for conn in dead:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

        if dead:
            logger.debug("Removed {} dead connections", len(dead))

    async def broadcast_stocks_update(self, stocks: list[Stock]) -> None:
        """Broadcast a full stocks update."""
        logger.debug("broadcasting stocks updates: {}", stocks)
        stocks_data = [
            StockResponse.model_validate(s).model_dump(mode="json") for s in stocks
        ]
        await self.broadcast({"type": "stocks_update", "stocks": stocks_data})

    async def broadcast_stock_update(self, stock: Stock) -> None:
        """Broadcast a single stock update."""
        logger.debug("broadcasting stock update: {}", stock)
        stock_data = StockResponse.model_validate(stock).model_dump(mode="json")
        await self.broadcast({"type": "stock_update", "stock": stock_data})

    async def detect_and_broadcast_events(
        self,
        stocks: list[Stock],
        previous_stocks: dict[str, Stock] | None = None,
    ) -> None:
        """Detect market events and broadcast them.

        Events detected:
        - new_leader: When rank #1 changes
        - all_time_high: When a stock hits a new highest price
        - big_crash: When a stock drops below CRASH_THRESHOLD
        """
        if not stocks:
            return

        events: list[dict[str, object]] = []

        # Find current leader (rank 1)
        leader = min(stocks, key=lambda s: s.rank or 999)

        # New leader detection
        if self._previous_leader is not None and leader.ticker != self._previous_leader:
            events.append(
                {
                    "type": "event",
                    "event_type": "new_leader",
                    "stock": StockResponse.model_validate(leader).model_dump(
                        mode="json"
                    ),
                    "metadata": {"previous_leader_ticker": self._previous_leader},
                }
            )
            logger.info("Event: new_leader - {} took the lead", leader.ticker)

        self._previous_leader = leader.ticker

        # Per-stock events
        for stock in stocks:
            prev_highest = self._highest_prices.get(stock.ticker, 0)

            # All-time high detection
            if stock.price > prev_highest and prev_highest > 0:
                events.append(
                    {
                        "type": "event",
                        "event_type": "all_time_high",
                        "stock": StockResponse.model_validate(stock).model_dump(
                            mode="json"
                        ),
                        "metadata": {
                            "previous_high": prev_highest,
                            "new_high": stock.price,
                        },
                    }
                )
                logger.info(
                    "Event: all_time_high - {} hit {:.2f}", stock.ticker, stock.price
                )

            self._highest_prices[stock.ticker] = max(stock.price, prev_highest)

            # Big crash detection
            if previous_stocks and stock.ticker in previous_stocks:
                prev = previous_stocks[stock.ticker]
                prev_pct = prev.percentage_change
                curr_pct = stock.percentage_change

                # Only trigger if crossing the threshold (wasn't already below)
                if prev_pct is not None and curr_pct is not None:
                    if prev_pct > CRASH_THRESHOLD and curr_pct <= CRASH_THRESHOLD:
                        events.append(
                            {
                                "type": "event",
                                "event_type": "big_crash",
                                "stock": StockResponse.model_validate(stock).model_dump(
                                    mode="json"
                                ),
                                "metadata": {"crash_percent": curr_pct},
                            }
                        )
                        logger.info(
                            "Event: big_crash - {} dropped to {:.1f}%",
                            stock.ticker,
                            curr_pct,
                        )

        # Broadcast all events
        for event in events:
            await self.broadcast(event)


# Global manager instance
manager = ConnectionManager()
