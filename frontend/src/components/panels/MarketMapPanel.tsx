'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { useStocks } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';
import {
  DisplayLoading,
  Panel,
  TickerSymbol,
  StockPrice,
  PercentChange,
  StockTitle,
  COLORS,
  CHART_THEME,
  getSentimentBgColor,
  getSentimentColor,
  formatPrice,
  formatPercent,
  getArrowSymbol,
  getChangeColorClass,
} from '@/components/display';
import { LOADING_MESSAGES, LABELS } from '@/constants/messages';

interface MarketMapPanelProps {
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
}

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, percent_change, ticker, price, compact } = props;

  const minWidth = compact ? 30 : 50;
  const minHeight = compact ? 25 : 40;
  if (width < minWidth || height < minHeight) {
    return null;
  }

  const change = percent_change ?? 0;
  const fillColor = getSentimentBgColor(change);
  const textColor = change !== 0 ? getSentimentColor(change) : COLORS.primary;
  const glowColor = change !== 0 ? `0 0 4px ${getSentimentColor(change)}` : 'none';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: COLORS.primary,
          strokeWidth: 1,
          opacity: 0.9,
        }}
      />
      <foreignObject x={x + 2} y={y + 2} width={width - 4} height={height - 4}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: 'white',
            padding: compact ? '2px' : '4px',
            fontFamily: 'var(--font-body), monospace',
            textTransform: 'uppercase',
          }}
        >
          <div>
            <TickerSymbol
              ticker={ticker}
              size={compact ? 'sm' : 'lg'}
              variant="accent"
              className="led-glow"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <StockPrice value={price ?? 0} change={change} size="xs" />
            <span style={{ textShadow: glowColor }}>
              <PercentChange value={change} showArrow size={compact ? 'xs' : 'sm'} />
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Embeddable market map treemap
 */
export function MarketMapPanel({
  compact = false,
  className,
  hideHeader = false,
}: MarketMapPanelProps) {
  const { stocks, isLoading } = useStocks();

  const treemapData = useMemo(() => {
    return stocks.map((stock) => ({
      ...stock,
      name: stock.title,
      size: Math.max(stock.price, 1),
      compact,
    }));
  }, [stocks, compact]);

  if (isLoading && stocks.length === 0) {
    return (
      <Panel title="MARKT-KARTE" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.marketMap} />
      </Panel>
    );
  }

  return (
    <Panel
      title="MARKT-KARTE"
      info={
        <>
          <span style={{ color: COLORS.positive }}>▲ {LABELS.winners}</span>
          {' '}
          <span style={{ color: COLORS.negative }}>▼ {LABELS.losers}</span>
        </>
      }
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          nameKey="name"
          aspectRatio={16 / 9}
          content={<CustomizedContent compact={compact} />}
          isAnimationActive={false}
        >
          <Tooltip
            contentStyle={CHART_THEME.tooltip.contentStyle}
            labelStyle={{ color: COLORS.secondary, fontWeight: 'bold', textTransform: 'uppercase' }}
            formatter={(value: number, name: string, props: any) => {
              if (!props.payload?.payload) return null;
              const stockData = props.payload.payload as StockResponse;
              return [
                <span key="price" className="text-primary font-bold">
                  {formatPrice(stockData.price)} CHF
                </span>,
                <span key="change" className={getChangeColorClass(stockData.change)}>
                  {getArrowSymbol(stockData.change, false)} {formatPercent(stockData.percent_change, true, 2)}
                </span>,
              ];
            }}
            labelFormatter={(label) => <span className="text-lg text-accent">{label}</span>}
          />
        </Treemap>
      </ResponsiveContainer>
    </Panel>
  );
}
