'use client';

import { useMemo } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import { formatPrice, COLORS } from '@/components/display';

interface MarketSummaryBarProps {
  /** Title to display on the left */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact market summary bar showing key metrics
 * Used in Bloomberg-style composite views
 */
export function MarketSummaryBar({
  title = 'SMG BLOOMBERG',
  className,
}: MarketSummaryBarProps) {
  const { stocks } = useStocks();

  const stats = useMemo(() => {
    if (stocks.length === 0) return null;
    const totalValue = stocks.reduce((sum, s) => sum + s.price, 0);
    const avgChange = stocks.reduce((sum, s) => sum + s.percent_change, 0) / stocks.length;
    const gainers = stocks.filter((s) => s.percent_change > 0).length;
    const losers = stocks.filter((s) => s.percent_change < 0).length;
    return { totalValue, avgChange, gainers, losers, total: stocks.length };
  }, [stocks]);

  return (
    <div className={`flex items-center justify-between px-3 py-1 border-b border-border bg-black text-xs shrink-0 ${className ?? ''}`}>
      <div className="flex items-center gap-4">
        <span className="text-primary font-bold">{title}</span>
        {stats && (
          <>
            <span className="text-muted-foreground">
              MARKT: <span className="text-primary">{formatPrice(stats.totalValue)} CHF</span>
            </span>
            <span className="text-muted-foreground">
              Ø CHG:{' '}
              <span style={{ color: stats.avgChange >= 0 ? COLORS.positive : COLORS.negative }}>
                {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
              </span>
            </span>
            <span style={{ color: COLORS.positive }}>▲ {stats.gainers}</span>
            <span style={{ color: COLORS.negative }}>▼ {stats.losers}</span>
          </>
        )}
      </div>
      <span className="text-muted-foreground">{stats?.total ?? 0} TITEL AKTIV</span>
    </div>
  );
}
