'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { useStocks } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';

/**
 * A custom content renderer for the Treemap component from recharts.
 * It renders each cell of the treemap, styling it based on the stock's performance.
 * Bloomberg terminal style with retro aesthetics.
 */
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, percent_change, ticker, price } = props;

  // Don't render cells that are too small to be readable
  if (width < 50 || height < 40) {
    return null;
  }

  const isPositive = percent_change > 0;
  const isNegative = percent_change < 0;

  // Retro trading floor colors - darker, more muted for terminal look
  const fillColor = isPositive
    ? '#166534' // Dark green
    : isNegative
      ? '#991b1b' // Dark red
      : '#374151'; // Neutral gray

  const textColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#ff9900';
  const glowColor = isPositive ? '0 0 4px #22c55e' : isNegative ? '0 0 4px #ef4444' : 'none';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: '#ff9900',
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
            padding: '4px',
            fontFamily: 'var(--font-body), monospace',
            textTransform: 'uppercase',
          }}
        >
          <div>
            <div style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#ffcc00',
              textShadow: '0 0 4px #ffcc00',
              letterSpacing: '0.05em',
            }}>
              {ticker}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#ff9900',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{
              fontSize: '0.85rem',
              fontFamily: 'var(--font-body), monospace',
              fontWeight: 600,
              color: textColor,
            }}>
              {price?.toFixed(2)}
            </div>
            <div style={{
              fontSize: '1rem',
              fontFamily: 'var(--font-body), monospace',
              fontWeight: 700,
              color: textColor,
              textShadow: glowColor,
            }}>
              {isPositive ? '▲' : isNegative ? '▼' : '─'}
              {isPositive ? '+' : ''}
              {(percent_change ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * The client component for the Market Map page.
 * It fetches real-time stock data and visualizes it as a treemap.
 * The size of each rectangle represents the stock's current value,
 * and the color indicates whether its value has increased (green) or decreased (red).
 */
export default function MarketMapClient() {
  const { stocks, isLoading } = useStocks();

  // Memoize the data formatted for the treemap
  const treemapData = useMemo(() => {
    return stocks.map((stock) => ({
      ...stock,
      name: stock.title,
      // The size key for the treemap must be a positive number
      size: Math.max(stock.price, 1),
    }));
  }, [stocks]);

  if (isLoading && stocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-primary">
        <span className="text-2xl blink-cursor">LADE MARKT-KARTE</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Legend bar */}
      <div className="flex items-center justify-end px-4 py-1 border-b border-border">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{stocks.length} TITEL</span>
          <span className="text-green-500">▲ GEWINNER</span>
          <span className="text-red-500">▼ VERLIERER</span>
        </div>
      </div>

      {/* Treemap */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            aspectRatio={16 / 9}
            content={<CustomizedContent />}
            isAnimationActive={false}
          >
            <Tooltip
              contentStyle={{
                background: '#000',
                border: '2px solid #ff9900',
                borderRadius: '0',
                fontFamily: 'var(--font-body), monospace',
              }}
              labelStyle={{ color: '#ffcc00', fontWeight: 'bold', textTransform: 'uppercase' }}
              formatter={(value: number, name: string, props: any) => {
                if (!props.payload?.payload) return null;

                const stockData = props.payload.payload as StockResponse;
                const isPositive = stockData.change >= 0;

                return [
                  <span key="price" className="text-primary font-bold">{stockData.price.toFixed(2)} CHF</span>,
                  <span key="change" className={isPositive ? 'text-green-500' : 'text-red-500'}>
                    {isPositive ? '▲ +' : '▼ '}
                    {stockData.change.toFixed(2)} ({stockData.percent_change.toFixed(2)}%)
                  </span>,
                ];
              }}
              labelFormatter={(label) => <span className="text-lg text-accent">{label}</span>}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
