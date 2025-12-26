'use client';

import { useMemo } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import {
  Panel,
  TickerSymbol,
  StockTitle,
  StockPrice,
  PercentChange,
  StatBox,
  DisplayLoading,
} from '@/components/display';
import { LOADING_MESSAGES, LABELS, EMPTY_STATE_MESSAGES } from '@/constants/messages';

interface MarketStatsPanelProps {
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Number of stocks to show per category */
  stocksPerCategory?: number;
}

/**
 * Embeddable market statistics panel showing key market metrics
 */
export function MarketStatsPanel({
  compact = false,
  className,
  hideHeader = false,
  stocksPerCategory = 3,
}: MarketStatsPanelProps) {
  const { stocks, isLoading } = useStocks();

  const stats = useMemo(() => {
    if (stocks.length === 0) return null;

    const count = Math.min(stocksPerCategory, stocks.length);
    const highest = [...stocks].sort((a, b) => b.price - a.price).slice(0, count);
    const lowest = [...stocks].sort((a, b) => a.price - b.price).slice(0, count);
    const biggestMove = [...stocks].sort((a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change)).slice(0, count);
    const mostStable = [...stocks].sort((a, b) => Math.abs(a.percent_change) - Math.abs(b.percent_change)).slice(0, count);

    return { highest, lowest, biggestMove, mostStable };
  }, [stocks, stocksPerCategory]);

  if (isLoading && stocks.length === 0) {
    return (
      <Panel title="STATISTIK" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.terminal} />
      </Panel>
    );
  }

  if (!stats) {
    return (
      <Panel title="STATISTIK" className={className} hideHeader={hideHeader} compact={compact}>
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          {EMPTY_STATE_MESSAGES.noDataShort}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="STATISTIK"
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <div className="h-full p-2 grid grid-cols-2 gap-2 text-xs overflow-auto">
        <StatBox label={LABELS.highestPrice}>
          {stats.highest.map((stock, i) => (
            <div key={stock.ticker} className={i > 0 ? 'mt-1 pt-1 border-t border-border/30' : ''}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TickerSymbol ticker={stock.ticker} size="xs" />
                  <StockTitle title={stock.title} size="xs" className="text-muted-foreground truncate" />
                </div>
                <StockPrice value={stock.price} change={stock.change} size="xs" glow={i === 0} />
              </div>
            </div>
          ))}
        </StatBox>
        <StatBox label={LABELS.lowestPrice}>
          {stats.lowest.map((stock, i) => (
            <div key={stock.ticker} className={i > 0 ? 'mt-1 pt-1 border-t border-border/30' : ''}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TickerSymbol ticker={stock.ticker} size="xs" />
                  <StockTitle title={stock.title} size="xs" className="text-muted-foreground truncate" />
                </div>
                <StockPrice value={stock.price} change={stock.change} size="xs" glow={i === 0} />
              </div>
            </div>
          ))}
        </StatBox>
        <StatBox label={LABELS.biggestMove}>
          {stats.biggestMove.map((stock, i) => (
            <div key={stock.ticker} className={i > 0 ? 'mt-1 pt-1 border-t border-border/30' : ''}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TickerSymbol ticker={stock.ticker} size="xs" />
                  <StockTitle title={stock.title} size="xs" className="text-muted-foreground truncate" />
                </div>
                <PercentChange value={stock.percent_change} showArrow size="xs" />
              </div>
            </div>
          ))}
        </StatBox>
        <StatBox label={LABELS.mostStable}>
          {stats.mostStable.map((stock, i) => (
            <div key={stock.ticker} className={i > 0 ? 'mt-1 pt-1 border-t border-border/30' : ''}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TickerSymbol ticker={stock.ticker} size="xs" />
                  <StockTitle title={stock.title} size="xs" className="text-muted-foreground truncate" />
                </div>
                <PercentChange value={stock.percent_change} showArrow size="xs" />
              </div>
            </div>
          ))}
        </StatBox>
      </div>
    </Panel>
  );
}
