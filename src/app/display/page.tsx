'use client';

import { mockStocks } from '@/lib/mock-data';
import type { Stock } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';

const StockTicker = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    const loadData = () => {
      const hasRegistered = localStorage.getItem('firstRegistration') === 'true';
      let stocksToDisplay;
      if (hasRegistered) {
        const storedStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
        stocksToDisplay = storedStocks.length > 0 ? storedStocks : mockStocks;
      } else {
        stocksToDisplay = mockStocks;
      }
      setStocks(stocksToDisplay);
    };

    loadData();
    const interval = setInterval(loadData, 2000); // Poll for updates every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const repeatedStocks = useMemo(() => {
     if (stocks.length === 0) return [];
    // Ensure the list is long enough for a seamless loop
    const repeatCount = Math.max(2, Math.ceil(40 / stocks.length));
    return Array(repeatCount).fill(stocks).flat();
  }, [stocks]);


  if (stocks.length === 0) {
    return (
      <div className="w-full bg-gray-900 text-white h-full flex items-center justify-center">
        <span className="text-2xl font-mono font-bold text-gray-400">
          Waiting for market data...
        </span>
      </div>
    );
  }

  // Calculate a dynamic duration based on the number of original items
  const animationDuration = stocks.length * 5;

  return (
    <div className="w-full bg-gray-900 text-white h-full flex items-center overflow-hidden">
      <div
        className="flex animate-marquee whitespace-nowrap"
        style={{ animationDuration: `${animationDuration}s` }}
      >
        {repeatedStocks.map((stock, index) => (
          <div
            key={`${stock.id}-${index}`}
            className="flex items-center mx-6"
          >
            <span className="text-2xl font-mono font-bold text-gray-400">
              {stock.nickname}
            </span>
            <span
              className={`text-2xl font-mono font-bold ml-3 ${
                stock.sentiment >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              ${stock.value.toFixed(2)}
            </span>
            <span
              className={`ml-2 text-lg ${
                stock.sentiment >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {stock.sentiment > 0 ? '▲' : stock.sentiment < 0 ? '▼' : ''}
            </span>
          </div>
        ))}
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
      `}</style>
    </div>
  );
};

export default function DisplayTickerPage() {
  return (
    <div className="h-full w-full">
      <StockTicker />
    </div>
  );
}
