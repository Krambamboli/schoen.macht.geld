'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useStocks, useStockSnapshots } from '@/hooks/use-stocks';

/**
 * A client component that displays a full-screen, auto-playing chart for each stock.
 * It cycles through stocks every 20 seconds, showing a detailed history graph,
 * the stock's photo, and key performance indicators.
 */
export default function StockChartClient() {
  const { stocks, isLoading } = useStocks();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get the current stock
  const activeStock = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    return stocks[currentIndex % stocks.length];
  }, [stocks, currentIndex]);

  // Fetch snapshots for the active stock
  const { snapshots } = useStockSnapshots(activeStock?.ticker ?? null, 100);

  // Effect to cycle through the stocks every 20 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (!stocks || stocks.length === 0) return 0;
        return (prevIndex + 1) % stocks.length;
      });
    }, 20000);

    return () => clearInterval(timer);
  }, [stocks]);

  if (isLoading || !activeStock) {
    return (
      <div className="flex items-center justify-center h-full text-primary bg-black">
        <span className="text-2xl blink-cursor">LADE CHART-DATEN</span>
      </div>
    );
  }

  // Format snapshots for the chart
  const chartData = snapshots.map((snapshot) => ({
    value: snapshot.price,
    timestamp: new Date(snapshot.created_at).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const isPositive = activeStock.percent_change >= 0;
  const imageUrl = activeStock.image || '/placeholder.png';
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const gridColor = 'rgba(255, 153, 0, 0.2)';

  return (
    <div className="w-full h-full flex flex-col bg-black text-primary">
      {/* Stock counter */}
      <div className="flex items-center justify-end px-4 py-1 border-b border-border bg-black">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{stocks?.length || 0} TITEL │ NÄCHSTER IN 20s</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStock.ticker}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1 } }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
          className="flex-1 flex flex-col p-4"
        >
          {/* Stock Header */}
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 overflow-hidden border-2 border-primary">
                <Image
                  unoptimized
                  src={imageUrl}
                  alt={activeStock.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-primary">{activeStock.title}</h1>
                <p className="text-2xl text-accent font-bold">{activeStock.ticker}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={cn(
                  'text-5xl font-bold led-glow',
                  isPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {activeStock.price.toFixed(2)} <span className="text-3xl text-muted-foreground">CHF</span>
              </span>
              <div
                className={cn(
                  'flex items-center justify-end gap-2 text-2xl font-bold mt-1',
                  isPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {isPositive ? <ArrowUp size={28} /> : <ArrowDown size={28} />}
                <span>
                  {isPositive ? '+' : ''}
                  {activeStock.change.toFixed(2)} ({activeStock.percent_change.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 mt-4 border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`color-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="1 1"
                  stroke={gridColor}
                  strokeWidth={1}
                  horizontal={true}
                  vertical={true}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#ff9900', fontSize: 12 }}
                  tickLine={{ stroke: '#ff9900' }}
                  axisLine={{ stroke: '#ff9900', strokeWidth: 2 }}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fill: '#ff9900', fontSize: 12 }}
                  tickLine={{ stroke: '#ff9900' }}
                  axisLine={{ stroke: '#ff9900', strokeWidth: 2 }}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000',
                    border: '2px solid #ff9900',
                    color: '#ff9900',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#ffcc00' }}
                  formatter={(value: number) => [`${value.toFixed(2)} CHF`, 'WERT']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={4}
                  fillOpacity={1}
                  fill={`url(#color-${isPositive})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
