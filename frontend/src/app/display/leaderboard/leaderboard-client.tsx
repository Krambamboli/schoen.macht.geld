'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useStocks } from '@/hooks/use-stocks';

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
      <div className="h-full flex items-center justify-center bg-black text-white">
        Lade Rangliste...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 bg-black text-gray-200 overflow-hidden">
      <h1 className="text-3xl font-bold text-center mb-4 text-white">Rangliste</h1>
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-full">
          {sortedStocks.map((stock) => {
            const isPositive = stock.percent_change >= 0;
            const rankChange = stock.rank_change ?? 0;

            return (
              <div
                key={stock.ticker}
                className="grid grid-cols-[50px_1fr_80px_90px] items-center gap-2 p-2 rounded-lg bg-gray-900/50 border border-gray-800 text-base"
              >
                {/* Rank position with change indicator */}
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xl text-yellow-400 w-6 text-right">
                    {stock.rank ?? '-'}
                  </span>
                  {rankChange > 0 && (
                    <ArrowUp size={14} className="text-green-400" />
                  )}
                  {rankChange < 0 && (
                    <ArrowDown size={14} className="text-red-500" />
                  )}
                  {rankChange === 0 && stock.rank != null && (
                    <Minus size={14} className="text-gray-500" />
                  )}
                </div>

                {/* Stock info */}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-white truncate">{stock.title}</span>
                  <span className="text-xs font-mono text-gray-400">{stock.ticker}</span>
                </div>

                {/* Price */}
                <span
                  className={cn(
                    'font-mono font-bold text-right',
                    isPositive ? 'text-green-400' : 'text-red-500'
                  )}
                >
                  {stock.price.toFixed(2)}
                </span>

                {/* Percent change */}
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 font-bold',
                    isPositive ? 'text-green-400' : 'text-red-500'
                  )}
                >
                  {stock.percent_change !== 0 && (
                    isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                  )}
                  <span>
                    {isPositive ? '+' : ''}
                    {stock.percent_change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
