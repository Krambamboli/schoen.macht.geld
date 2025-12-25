'use client';

import { useMemo } from 'react';
import { useStocks } from '@/hooks/use-stocks';

/**
 * A component that displays a horizontally scrolling stock ticker.
 * It fetches real-time stock data and animates the prices across the screen.
 */
const StockTicker = () => {
  const { stocks, isLoading } = useStocks();

  // The stock list is duplicated to create a seamless looping animation
  const repeatedStocks = useMemo(() => {
    if (!stocks || stocks.length === 0) return [];
    const repeatCount = Math.max(2, Math.ceil(40 / stocks.length));
    return Array(repeatCount).fill(stocks).flat();
  }, [stocks]);

  if (isLoading && stocks.length === 0) {
    return (
      <div className="w-full bg-black text-primary flex items-center justify-center py-8">
        <span className="text-2xl font-bold uppercase tracking-wider led-glow">
          ▌ WARTE AUF MARKTDATEN... ▐
        </span>
      </div>
    );
  }

  // Calculate a dynamic animation duration based on the number of items
  const animationDuration = (stocks?.length || 10) * 5;

  return (
    <div className="w-full bg-black text-primary flex items-center overflow-hidden">
      <div
        className="flex animate-marquee whitespace-nowrap"
        style={{ animationDuration: `${animationDuration}s` }}
      >
        {repeatedStocks.map((stock, index) => {
          const isPositive = stock.change >= 0;
          const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
          return (
            <div key={`${stock.ticker}-${index}`} className="flex items-center">
              {/* Box-drawing separator */}
              <span className="text-2xl text-muted-foreground mx-2">│</span>
              {/* Stock ticker symbol */}
              <span className="text-xl font-bold text-primary uppercase tracking-wide">
                {stock.ticker}
              </span>
              {/* Price with LED glow */}
              <span className={`text-2xl font-bold ml-3 led-glow ${changeColor}`}>
                {stock.price.toFixed(2)}
              </span>
              {/* Currency */}
              <span className="text-lg text-muted-foreground ml-1">CHF</span>
              {/* Change indicator */}
              <span className={`ml-2 text-xl font-bold ${changeColor}`}>
                {stock.change > 0 ? '▲' : stock.change < 0 ? '▼' : '─'}
              </span>
              {/* Percentage change */}
              <span className={`ml-1 text-lg ${changeColor}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(1) || '0.0'}%
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .led-glow {
          text-shadow: 0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor;
        }
      `}</style>
    </div>
  );
};

/**
 * The main page for the stock ticker display.
 */
export default function DisplayTickerPage() {
  return (
    <div className="h-full w-full flex items-center bg-black">
      <StockTicker />
    </div>
  );
}
