'use client';

import { useMemo } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import {
  Panel,
  StockListItem,
  DisplayLoading,
  COLORS,
} from '@/components/display';
import { LOADING_MESSAGES, LABELS } from '@/constants/messages';

interface TopMoversPanelProps {
  /** Number of gainers/losers to show each */
  limit?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Currently selected ticker (for highlighting) */
  selectedTicker?: string | null;
  /** Callback when a stock is clicked */
  onStockSelect?: (ticker: string | null) => void;
}

/**
 * Embeddable top movers panel showing gainers and losers
 */
export function TopMoversPanel({
  limit = 5,
  compact = false,
  className,
  hideHeader = false,
  selectedTicker,
  onStockSelect,
}: TopMoversPanelProps) {
  const { stocks, isLoading } = useStocks();

  const topGainers = useMemo(() => {
    return [...stocks]
      .sort((a, b) => b.percent_change - a.percent_change)
      .slice(0, limit);
  }, [stocks, limit]);

  const topLosers = useMemo(() => {
    return [...stocks]
      .sort((a, b) => a.percent_change - b.percent_change)
      .slice(0, limit);
  }, [stocks, limit]);

  if (isLoading && stocks.length === 0) {
    return (
      <Panel title="TOP MOVER" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.terminal} />
      </Panel>
    );
  }

  const handleClick = (ticker: string) => {
    if (onStockSelect) {
      onStockSelect(ticker === selectedTicker ? null : ticker);
    }
  };

  return (
    <Panel
      title="TOP MOVER"
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <div className="h-full overflow-auto p-1 space-y-2">
        {/* Gainers */}
        <div>
          <div className="text-xs font-bold px-1 mb-1" style={{ color: COLORS.positive }}>
            ▲ {LABELS.winners}
          </div>
          {topGainers.map((stock, i) => (
            <StockListItem
              key={stock.ticker}
              ticker={stock.ticker}
              percentChange={stock.percent_change}
              rank={i + 1}
              selected={stock.ticker === selectedTicker}
              onClick={() => handleClick(stock.ticker)}
            />
          ))}
        </div>

        {/* Losers */}
        <div>
          <div className="text-xs font-bold px-1 mb-1" style={{ color: COLORS.negative }}>
            ▼ {LABELS.losers}
          </div>
          {topLosers.map((stock, i) => (
            <StockListItem
              key={stock.ticker}
              ticker={stock.ticker}
              percentChange={stock.percent_change}
              rank={i + 1}
              selected={stock.ticker === selectedTicker}
              onClick={() => handleClick(stock.ticker)}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}
