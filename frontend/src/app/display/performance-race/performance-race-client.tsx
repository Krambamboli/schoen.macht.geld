'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { useRaceData, type RaceStock } from '@/hooks/use-stocks';

/**
 * Performance Race display.
 * Shows an animated line chart racing the top 5 stocks against each other.
 */
export default function PerformanceRaceClient() {
  const { raceStocks, raceData, isLoading } = useRaceData(5, 50);

  // Sort stocks by current position (latest data point) for the legend
  const sortedStocks = useMemo(() => {
    if (raceData.length === 0 || raceStocks.length === 0) return raceStocks;

    const latestPoint = raceData[raceData.length - 1];
    return [...raceStocks].sort((a, b) => {
      const aValue = (latestPoint[a.ticker] as number) ?? 0;
      const bValue = (latestPoint[b.ticker] as number) ?? 0;
      return bValue - aValue; // Higher value = better position
    });
  }, [raceStocks, raceData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white bg-black">
        <div className="text-2xl animate-pulse">Lade Renndaten...</div>
      </div>
    );
  }

  if (raceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white bg-black">
        <div className="text-2xl">Keine Daten verfügbar</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 flex flex-col bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <h1 className="text-4xl font-bold">Performance Race</h1>
        </div>
        <div className="text-gray-400 text-lg">Top 5 Aktien im Vergleich</div>
      </div>

      {/* Main content: Chart + Legend */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chart */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={raceData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: 'white', fontSize: 12 }}
                tickLine={{ stroke: 'white' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'white', fontSize: 12 }}
                tickLine={{ stroke: 'white' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: 'white',
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                formatter={(value: number, name: string) => {
                  const stock = raceStocks.find((s) => s.ticker === name);
                  return [`${value.toFixed(1)}%`, stock?.title ?? name];
                }}
              />
              {raceStocks.map((stock) => (
                <Line
                  key={stock.ticker}
                  type="monotone"
                  dataKey={stock.ticker}
                  stroke={stock.color}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Leaderboard */}
        <div className="w-72 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Rangliste
          </h2>
          {sortedStocks.map((stock, index) => (
            <RaceStockCard key={stock.ticker} stock={stock} position={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RaceStockCard({ stock, position }: { stock: RaceStock; position: number }) {
  const isPositive = stock.percentChange >= 0;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border-l-4"
      style={{ borderLeftColor: stock.color }}
    >
      {/* Position */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg',
          position === 1 && 'bg-yellow-500 text-black',
          position === 2 && 'bg-gray-400 text-black',
          position === 3 && 'bg-amber-700 text-white',
          position > 3 && 'bg-zinc-700 text-white'
        )}
      >
        {position}
      </div>

      {/* Stock image */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-zinc-700 flex-shrink-0">
        {stock.image ? (
          <Image
            unoptimized
            src={stock.image}
            alt={stock.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
            {stock.ticker.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Stock info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{stock.title}</div>
        <div className="text-sm text-gray-400 font-mono">{stock.ticker}</div>
      </div>

      {/* Price & change */}
      <div className="text-right">
        <div className="font-mono font-semibold">{stock.currentPrice.toFixed(2)}</div>
        <div
          className={cn(
            'text-sm font-mono',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? '+' : ''}
          {stock.percentChange.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
