'use client';

import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import {
  StockPrice,
  PercentChange,
  TickerSymbol,
  StockTitle,
  RankBadge,
  DisplayLoading,
  Panel,
  getAlternatingRowClass,
} from '@/components/display';
import { LOADING_MESSAGES } from '@/constants/messages';

interface LeaderboardPanelProps {
  /** Maximum number of items to display */
  limit?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
}

/**
 * Embeddable leaderboard grid
 */
export function LeaderboardPanel({
  limit,
  compact = false,
  className,
  hideHeader = false,
}: LeaderboardPanelProps) {
  const { stocks, isLoading } = useStocks();

  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return a.title.localeCompare(b.title);
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [stocks, limit]);

  if (isLoading && stocks.length === 0) {
    return (
      <Panel title="RANGLISTE" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.leaderboard} />
      </Panel>
    );
  }

  return (
    <Panel
      title="RANGLISTE"
      info={`TOP ${sortedStocks.length}`}
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <div className="overflow-auto h-full p-1">
        <div className={cn('grid gap-1', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
          {sortedStocks.map((stock, index) => {
            const isTop3 = (stock.rank ?? 999) <= 3;

            return (
              <div
                key={stock.ticker}
                data-stock-card
                className={cn(
                  'grid items-center gap-1 border',
                  compact
                    ? 'grid-cols-[30px_1fr_50px] px-1 py-0.5 text-xs'
                    : 'grid-cols-[40px_1fr_60px_70px] px-2 py-1 text-sm',
                  isTop3 ? 'border-accent bg-accent/10' : 'border-border',
                  getAlternatingRowClass(index)
                )}
              >
                <RankBadge
                  rank={stock.rank}
                  rankChange={stock.rank_change ?? 0}
                  highlight={isTop3}
                  size={compact ? 'sm' : 'md'}
                  flash
                  trackingKey={stock.ticker}
                />

                <div className="overflow-hidden flex items-center gap-2">
                  {!compact && <TickerSymbol ticker={stock.ticker} size="xs" />}
                  <StockTitle title={stock.title} size="xs" className="font-bold" />
                </div>

                <StockPrice
                  value={stock.price}
                  change={stock.percent_change}
                  flash
                  trackingKey={stock.ticker}
                  className="text-right"
                  size="xs"
                />

                {!compact && (
                  <PercentChange
                    value={stock.percent_change}
                    showArrow
                    flash
                    trackingKey={stock.ticker}
                    size="xs"
                    className="text-right"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
