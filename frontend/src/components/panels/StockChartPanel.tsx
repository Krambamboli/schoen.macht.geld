'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStocks, useStockSnapshots } from '@/hooks/use-stocks';
import {
  StockPrice,
  PercentChange,
  TickerSymbol,
  StockTitle,
  ChangeArrow,
  DisplayLoading,
  Panel,
  StockImage,
  COLORS,
  CHART_THEME,
} from '@/components/display';
import { LOADING_MESSAGES } from '@/constants/messages';
import { TIMINGS } from '@/constants/timings';

interface StockChartPanelProps {
  /** Specific ticker to display (if not set, rotates through all) */
  ticker?: string;
  /** Whether to auto-rotate through stocks */
  autoRotate?: boolean;
  /** Rotation interval in ms */
  rotationInterval?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
}

/**
 * Embeddable stock chart with optional auto-rotation
 */
export function StockChartPanel({
  ticker,
  autoRotate = true,
  rotationInterval = TIMINGS.stockChartRotation,
  compact = false,
  className,
  hideHeader = false,
}: StockChartPanelProps) {
  const { stocks, isLoading } = useStocks();
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeStock = useMemo(() => {
    if (ticker) {
      return stocks.find((s) => s.ticker === ticker) ?? null;
    }
    if (!stocks || stocks.length === 0) return null;
    return stocks[currentIndex % stocks.length];
  }, [stocks, currentIndex, ticker]);

  const { snapshots } = useStockSnapshots(activeStock?.ticker ?? null, 50);

  useEffect(() => {
    if (!autoRotate || ticker) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (!stocks || stocks.length === 0) return 0;
        return (prev + 1) % stocks.length;
      });
    }, rotationInterval);
    return () => clearInterval(timer);
  }, [stocks, autoRotate, ticker, rotationInterval]);

  if (isLoading || !activeStock) {
    return (
      <Panel title="CHART" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.stockChart} />
      </Panel>
    );
  }

  const chartData = snapshots.map((snapshot) => ({
    value: snapshot.price,
    timestamp: new Date(snapshot.created_at).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const isPositive = activeStock.percent_change >= 0;
  const lineColor = isPositive ? COLORS.positive : COLORS.negative;

  return (
    <Panel
      title="CHART"
      info={!ticker && `${currentIndex + 1}/${stocks.length}`}
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <div className="h-full flex flex-col">
        {/* Stock header */}
        <div
          className={`flex items-center justify-between border-b border-border shrink-0 ${
            compact ? 'px-2 py-1' : 'px-3 py-2'
          }`}
        >
          <div className="flex items-center gap-2">
            {!compact && (
              <StockImage
                src={activeStock.image}
                alt={activeStock.title}
                ticker={activeStock.ticker}
                size="sm"
              />
            )}
            <div>
              <TickerSymbol ticker={activeStock.ticker} size={compact ? 'sm' : 'md'} />
              {!compact && <StockTitle title={activeStock.title} size="xs" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StockPrice
              value={activeStock.price}
              change={activeStock.change}
              size={compact ? 'sm' : 'lg'}
              glow
            />
            <ChangeArrow value={activeStock.change} variant="icon" size={compact ? 'sm' : 'md'} />
            <PercentChange value={activeStock.percent_change} size={compact ? 'sm' : 'md'} />
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`panel-color-${activeStock.ticker}-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray={CHART_THEME.grid.strokeDasharray}
                stroke={CHART_THEME.grid.stroke}
              />
              {!compact && (
                <>
                  <XAxis
                    dataKey="timestamp"
                    tick={{ ...CHART_THEME.axis.tick, fontSize: 10 }}
                    tickLine={CHART_THEME.axis.tickLine}
                    axisLine={CHART_THEME.axis.axisLine}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tick={{ ...CHART_THEME.axis.tick, fontSize: 10 }}
                    tickLine={CHART_THEME.axis.tickLine}
                    axisLine={CHART_THEME.axis.axisLine}
                    tickFormatter={(value) => value.toFixed(0)}
                    width={30}
                  />
                </>
              )}
              <Tooltip
                contentStyle={CHART_THEME.tooltip.contentStyle}
                labelStyle={{ fontWeight: 'bold', color: COLORS.secondary }}
                formatter={(value: number) => [`${value.toFixed(2)} CHF`, 'WERT']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#panel-color-${activeStock.ticker}-${isPositive})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}
