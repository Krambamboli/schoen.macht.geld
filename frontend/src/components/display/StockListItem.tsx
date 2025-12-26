'use client';

import { cn } from '@/lib/utils';
import { TickerSymbol, PercentChange } from '@/components/display';

interface StockListItemProps {
  /** Stock ticker symbol */
  ticker: string;
  /** Percent change value */
  percentChange: number;
  /** Rank/position number (optional) */
  rank?: number;
  /** Whether this item is selected */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Clickable stock list item showing ticker and percent change
 * Used in top movers panels and similar lists
 */
export function StockListItem({
  ticker,
  percentChange,
  rank,
  selected = false,
  onClick,
  className,
}: StockListItemProps) {
  return (
    <button
      data-stock-card
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-1 py-0.5 text-xs border transition-colors',
        selected
          ? 'border-accent bg-accent/20'
          : 'border-transparent hover:border-border hover:bg-primary/5',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {rank !== undefined && (
          <span className="text-muted-foreground w-4">{rank}.</span>
        )}
        <TickerSymbol ticker={ticker} size="xs" />
      </div>
      <PercentChange value={percentChange} size="xs" />
    </button>
  );
}
