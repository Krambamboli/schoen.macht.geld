'use client';

import type { Stock } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function LeaderboardClient() {
  const { firestore } = useFirebase();
  const titlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'titles') : null, [firestore]);
  const { data: stocks } = useCollection<Stock>(titlesCollection);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const sortedStocks = stocks ? [...stocks].sort((a, b) => b.percentChange - a.percentChange) : [];

  const currentRanks = new Map<string, number>();
  sortedStocks.forEach((stock, index) => {
    currentRanks.set(stock.id, index);
  });

  const getRankChange = (stockId: string, currentRank: number) => {
    if (!prevRanksRef.current.has(stockId)) {
      return 'same';
    }
    const prevRank = prevRanksRef.current.get(stockId)!;
    if (currentRank < prevRank) return 'up';
    if (currentRank > prevRank) return 'down';
    return 'same';
  };
  
  useEffect(() => {
    prevRanksRef.current = currentRanks;
  });

  return (
    <div className="h-full flex flex-col p-4 bg-black text-gray-200">
       <h1 className="text-3xl font-bold text-center mb-4 text-white">Market Leaders</h1>
      <div className="relative flex-1 overflow-y-auto">
        <ul className="space-y-2">
          <AnimatePresence>
            {sortedStocks.map((stock, index) => {
              const isPositive = stock.percentChange >= 0;
              const rankChange = getRankChange(stock.id, index);

              let RankIndicator;
              switch(rankChange) {
                  case 'up':
                      RankIndicator = <ArrowUp className="w-5 h-5 text-green-400" />;
                      break;
                  case 'down':
                      RankIndicator = <ArrowDown className="w-5 h-5 text-red-500" />;
                      break;
                  default:
                      RankIndicator = <Minus className="w-5 h-5 text-gray-600" />;
              }
              
              return (
                <motion.li
                  key={stock.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="grid grid-cols-[40px_40px_1fr_120px_120px] items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <span className="text-xl font-bold text-center text-gray-500">{index + 1}</span>
                  <div className="flex items-center justify-center">{RankIndicator}</div>
                  <div className='flex flex-col'>
                    <span className="text-2xl font-bold text-white">{stock.nickname}</span>
                     <span className="text-sm font-mono text-gray-400">{stock.ticker}</span>
                  </div>
                  <span className={cn(
                      'text-2xl font-mono font-bold text-right',
                      isPositive ? 'text-green-400' : 'text-red-500'
                    )}>
                    ${stock.currentValue.toFixed(2)}
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
