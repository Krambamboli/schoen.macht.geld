'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useStocks } from '@/hooks/use-stocks';
import { FlashValue } from '@/components/flash-value';

/**
 * The client component for the Leaderboard page.
 * It fetches all stock data from the API in real-time and displays them
 * sorted by rank in a grid that fits on a single screen without scrolling.
 */
export default function LeaderboardClient() {
  const { stocks, isLoading } = useStocks();

  // Sort stocks by rank (lowest rank number = highest position)
  // Stocks without a rank are placed at the end, sorted alphabetically
  const sortedStocks = [...stocks].sort((a, b) => {
    if (a.rank != null && b.rank != null) {
      return a.rank - b.rank;
    }
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.title.localeCompare(b.title);
  });

  if (isLoading && stocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-primary">
        <span className="text-2xl blink-cursor">LADE RANGLISTE</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 bg-black text-foreground overflow-hidden">
      <div className="flex items-center justify-end mb-2">
        <span className="text-sm text-muted-foreground">{sortedStocks.length} TITEL</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 h-full">
          {sortedStocks.map((stock, index) => {
            const isPositive = stock.percent_change >= 0;
            const rankChange = stock.rank_change ?? 0;
            const isTop3 = (stock.rank ?? 999) <= 3;

            return (
              <div
                key={stock.ticker}
                className={cn(
                  "grid grid-cols-[45px_1fr_70px_80px] items-center gap-1 px-2 py-1 border text-sm",
                  isTop3 ? "border-accent bg-accent/10" : "border-border",
                  index % 2 === 0 ? "bg-transparent" : "bg-primary/5"
                )}
              >
                {/* Rank position with change indicator */}
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-bold text-lg w-5 text-right",
                    isTop3 ? "text-accent led-glow" : "text-primary"
                  )}>
                    <FlashValue
                      value={stock.rank ?? '-'}
                      trackingKey={stock.ticker}
                    />
                  </span>
                  {rankChange > 0 && (
                    <ArrowUp size={12} className="text-green-500" />
                  )}
                  {rankChange < 0 && (
                    <ArrowDown size={12} className="text-red-500" />
                  )}
                  {rankChange === 0 && stock.rank != null && (
                    <span className="text-muted-foreground text-xs">─</span>
                  )}
                </div>

                {/* Stock info */}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-foreground truncate text-sm">{stock.title}</span>
                  <span className="text-xs text-accent">{stock.ticker}</span>
                </div>

                {/* Price */}
                <span
                  className={cn(
                    'font-bold text-right',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  <FlashValue
                    value={stock.price}
                    trackingKey={stock.ticker}
                    formatFn={(v) => Number(v).toFixed(2)}
                  />
                </span>

                {/* Percent change */}
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 font-bold',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {stock.percent_change !== 0 && (
                    isPositive ? <span>▲</span> : <span>▼</span>
                  )}
                  <FlashValue
                    value={stock.percent_change}
                    trackingKey={stock.ticker}
                    formatFn={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
