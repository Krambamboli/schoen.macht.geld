"""WebSocket connection manager for real-time stock updates."""

from fastapi import WebSocket
from loguru import logger

from app.models.stock import Stock
from app.schemas.stock import StockResponse


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

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

    async def broadcast_events(self, events: list[dict[str, object]]) -> None:
        """Broadcast a list of market events."""
        for event in events:
            await self.broadcast(event)


# Global manager instance
manager = ConnectionManager()
