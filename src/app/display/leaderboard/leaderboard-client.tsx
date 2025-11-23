
'use client';

import { mockStocks } from '@/lib/mock-data';
import type { Stock } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type StockWithChange = Stock & { change: number; percentChange: number };

export default function LeaderboardClient() {
  const [stocks, setStocks] = useState<StockWithChange[]>([]);
  const initialValuesRef = useRef(new Map<string, number>());

  useEffect(() => {
    const loadData = () => {
      const hasRegistered = localStorage.getItem('firstRegistration') === 'true';
      let stocksToDisplay: Stock[];

      if (hasRegistered) {
        const storedStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
        stocksToDisplay = storedStocks.length > 0 ? storedStocks : mockStocks;
      } else {
        stocksToDisplay = mockStocks;
      }

      // Initialize initial values if they don't exist yet for new stocks
      stocksToDisplay.forEach(stock => {
        if (!initialValuesRef.current.has(stock.id)) {
            initialValuesRef.current.set(stock.id, stock.value);
        }
      });


      const updatedStocks = stocksToDisplay.map(stock => {
        const initialValue = initialValuesRef.current.get(stock.id) ?? stock.value;
        const change = stock.value - initialValue;
        const percentChange = initialValue === 0 ? 0 : (change / initialValue) * 100;
        
        return {
          ...stock,
          change,
          percentChange,
        };
      });

      // Sort by performance (percent change)
      const sortedStocks = updatedStocks.sort((a, b) => b.percentChange - a.percentChange);
      
      setStocks(sortedStocks);
    };

    loadData();
    const dataInterval = setInterval(loadData, 1500); // Faster update for leaderboard

    return () => {
      clearInterval(dataInterval);
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-4 bg-black text-gray-200">
       <h1 className="text-3xl font-bold text-center mb-4 text-white">Market Leaders</h1>
      <div className="relative flex-1 overflow-y-auto">
        <ul className="space-y-2">
          <AnimatePresence>
            {stocks.map((stock, index) => {
              const isPositive = stock.percentChange >= 0;
              return (
                <motion.li
                  key={stock.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="grid grid-cols-[40px_1fr_120px_120px] items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <span className="text-xl font-bold text-center text-gray-500">{index + 1}</span>
                  <div className='flex flex-col'>
                    <span className="text-2xl font-bold text-white">{stock.nickname}</span>
                     <span className="text-sm font-mono text-gray-400">{stock.ticker}</span>
                  </div>
                  <span className={cn(
                      'text-2xl font-mono font-bold text-right',
                      isPositive ? 'text-green-400' : 'text-red-500'
                    )}>
                    ${stock.value.toFixed(2)}
                  </span>
                  <div className={cn(
                      'flex items-center justify-end gap-2 text-2xl font-bold',
                       isPositive ? 'text-green-400' : 'text-red-500'
                    )}>
                    {stock.percentChange !== 0 && (
                      isPositive ? <ArrowUp size={20} /> : <ArrowDown size={20} />
                    )}
                    <span>
                      {isPositive ? '+' : ''}{stock.percentChange.toFixed(2)}%
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
