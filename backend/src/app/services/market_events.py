"""Market events detection service."""

from loguru import logger

from app.config import settings
from app.models.stock import MarketState, Stock

# Event detection thresholds
CRASH_THRESHOLD = -10.0  # Trigger crash event at -10% or worse


class MarketEventsService:
    """Service for detecting market events and managing market state."""

    def __init__(self) -> None:
        # State for event detection
        self._previous_leader: str | None = None

    def detect_events(
        self,
        stocks: list[Stock],
        previous_stocks: dict[str, Stock] | None = None,
        market_state: MarketState | None = None,
    ) -> list[dict[str, object]]:
        """Detect market events and return them as a list.

        Events detected:
        - new_leader: When rank #1 changes
        - all_time_high: When a stock hits a new highest price
        - big_crash: When a stock drops below CRASH_THRESHOLD
        """
        if not stocks:
            return []

        events: list[dict[str, object]] = []

        # Find current leader (rank 1)
        leader = min(stocks, key=lambda s: s.rank or 999)

        # New leader detection
        if self._previous_leader is not None and leader.ticker != self._previous_leader:
            events.append(
                {
                    "type": "event",
                    "event_type": "new_leader",
                    "stock": self._stock_to_dict(leader),
                    "metadata": {"previous_leader_ticker": self._previous_leader},
                }
            )
            logger.info("Event: new_leader - {} took the lead", leader.ticker)

        self._previous_leader = leader.ticker

        # Per-stock events
        for stock in stocks:
            # All-time high detection - use previous_stocks to check if price just broke the max
            if previous_stocks and stock.ticker in previous_stocks:
                prev = previous_stocks[stock.ticker]
                prev_max = prev.max_price

                # Trigger if current price exceeds previous max_price
                if prev_max is not None and stock.price > prev_max:
                    events.append(
                        {
                            "type": "event",
                            "event_type": "all_time_high",
                            "stock": self._stock_to_dict(stock),
                            "metadata": {
                                "previous_high": prev_max,
                                "new_high": stock.price,
                            },
                        }
                    )
                    logger.info(
                        "Event: all_time_high - {} hit {:.2f}", stock.ticker, stock.price
                    )

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
                                "stock": self._stock_to_dict(stock),
                                "metadata": {"crash_percent": curr_pct},
                            }
                        )
                        logger.info(
                            "Event: big_crash - {} dropped to {:.1f}%",
                            stock.ticker,
                            curr_pct,
                        )

        return events

    def get_market_day_events(
        self, stocks: list[Stock], market_state: MarketState, previous_state: MarketState
    ) -> list[dict[str, object]]:
        """Generate market day events (open/close).

        Events:
        - market_close: When market day completes (before opening next day)
        - market_open: When market opens for next day (after previous day closes)
        """
        events: list[dict[str, object]] = []
        snapshots_per_day = settings.snapshots_per_market_day

        # Detect state transitions by comparing previous and current state
        was_open = previous_state.is_open
        is_open = market_state.is_open
        prev_day = previous_state.market_day_count
        curr_day = market_state.market_day_count

        # Market close: was open, now closed (happens before market_open in same cycle)
        if was_open and not is_open:
            # Find the stock that moved the most during the day (highest % gain)
            top_mover = None
            if stocks:
                stocks_with_change = [s for s in stocks if s.percentage_change is not None]
                if stocks_with_change:
                    top_mover = max(stocks_with_change, key=lambda s: s.percentage_change or 0)

            event: dict[str, object] = {
                "type": "event",
                "event_type": "market_close",
                "metadata": {
                    "market_day": curr_day,
                    "snapshots_per_day": snapshots_per_day,
                },
            }
            if top_mover:
                event["stock"] = self._stock_to_dict(top_mover)

            events.append(event)
            logger.info(
                "Event: market_close - Day {} complete ({} snapshots), top mover: {}",
                curr_day,
                snapshots_per_day,
                top_mover.ticker if top_mover else "none",
            )

        # Market open: market day advanced and market is open, or initial market open
        if (curr_day > prev_day and is_open) or (not was_open and is_open and curr_day == 0):
            market_day = curr_day + 1 if curr_day > 0 else 1
            events.append(
                {
                    "type": "event",
                    "event_type": "market_open",
                    "metadata": {
                        "market_day": market_day,
                        "snapshots_per_day": snapshots_per_day,
                    },
                }
            )
            logger.info(
                "Event: market_open - Day {} started", market_day
            )

        return events

    @staticmethod
    def _stock_to_dict(stock: Stock) -> dict[str, object]:
        """Convert Stock to dict for event payload."""
        from app.schemas.stock import StockResponse

        return StockResponse.model_validate(stock).model_dump(mode="json")


# Global service instance
market_events_service = MarketEventsService()
