'use client';

import { generateFunnyNewsHeadline } from '@/ai/flows/generate-funny-news-headlines';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Stock } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const NewsTicker = ({ stocks }: { stocks: Stock[] }) => {
  const [currentHeadline, setCurrentHeadline] = useState(
    'Willkommen beim Schön. Macht. Geld. News Network.'
  );
  const [nextHeadline, setNextHeadline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchHeadline = useCallback(async () => {
    if (isGenerating || !stocks || stocks.length === 0) return;
    setIsGenerating(true);
    try {
      const trendingStock = [...stocks].sort(
        (a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange)
      )[0];

      if (trendingStock && trendingStock.change !== 0) {
        const result = await generateFunnyNewsHeadline({
          stockTicker: trendingStock.ticker,
          companyName: trendingStock.nickname,
          description: trendingStock.description,
          currentValue: trendingStock.currentValue,
          change: trendingStock.change,
          percentChange: trendingStock.percentChange,
        });
        setNextHeadline(
          `${trendingStock.ticker.toUpperCase()}: ${result.headline}`
        );
      } else {
        setNextHeadline('Der Markt ist ruhig... zu ruhig. Worauf wartest du?');
      }
    } catch (error) {
      console.error('Failed to generate news headline:', error);
      setNextHeadline('NEWS: Der Markt hat technische Schwierigkeiten... oder sind es nur Gefühle?');
    } finally {
      setIsGenerating(false);
    }
  }, [stocks, isGenerating]);

  useEffect(() => {
    fetchHeadline(); // Initial fetch
    const interval = setInterval(fetchHeadline, 20000); // Generate a new headline every 20s
    return () => clearInterval(interval);
  }, [fetchHeadline]);

  const handleAnimationIteration = useCallback(() => {
    if (nextHeadline) {
      setCurrentHeadline(nextHeadline);
      setNextHeadline(''); // Clear next headline so we know we can fetch a new one
    }
  }, [nextHeadline]);

  useEffect(() => {
    const tickerElement = tickerRef.current;
    if (tickerElement) {
      tickerElement.addEventListener('animationiteration', handleAnimationIteration);
      return () => {
        tickerElement.removeEventListener('animationiteration', handleAnimationIteration);
      };
    }
  }, [handleAnimationIteration]);

  return (
    <div className="w-full bg-red-700 text-white h-10 flex items-center overflow-hidden">
      <div
        ref={tickerRef}
        className="flex animate-marquee-fast whitespace-nowrap"
      >
        <span className="text-xl font-bold px-12">{currentHeadline}</span>
        <span className="text-xl font-bold px-12" aria-hidden="true">{currentHeadline}</span>
      </div>
      <style jsx>{`
        @keyframes marquee-fast {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee-fast {
          animation: marquee-fast 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default function TerminalClient() {
    const { firestore } = useFirebase();
    const titlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'titles') : null, [firestore]);
    const { data: stocks } = useCollection<Stock>(titlesCollection);
    const prevRanksRef = useRef<Map<string, number>>(new Map());

    const sortedStocks = stocks ? [...stocks].sort((a, b) => b.currentValue - a.currentValue) : [];

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
    <div className="h-full flex flex-col p-2 bg-black text-green-400 font-mono">
      <div className="flex justify-between items-center text-yellow-400 border-b-2 border-yellow-400 pb-1">
        <h1 className="text-2xl">SMG TERMINAL</h1>
      </div>
      <div className="flex-1 overflow-y-auto mt-2">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-900">
              <TableHead className="text-yellow-400 w-12"></TableHead>
              <TableHead className="text-yellow-400">TICKER</TableHead>
              <TableHead className="text-yellow-400">NICKNAME</TableHead>
              <TableHead className="text-yellow-400 text-right">WERT</TableHead>
              <TableHead className="text-yellow-400 text-right">CHG</TableHead>
              <TableHead className="text-yellow-400 text-right">% CHG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStocks
              .map((stock, index) => {
                const isPositive = stock.change >= 0;
                const rankChange = getRankChange(stock.id, index);

                let RankIndicator;
                switch(rankChange) {
                    case 'up':
                        RankIndicator = <ArrowUp className="w-4 h-4 text-green-400" />;
                        break;
                    case 'down':
                        RankIndicator = <ArrowDown className="w-4 h-4 text-red-500" />;
                        break;
                    default:
                        RankIndicator = <Minus className="w-4 h-4 text-gray-600" />;
                }

                return (
                  <TableRow
                    key={stock.id}
                    className="border-gray-800 hover:bg-gray-900/50"
                  >
                    <TableCell className="w-12">{RankIndicator}</TableCell>
                    <TableCell className="font-bold">{stock.ticker}</TableCell>
                    <TableCell>{stock.nickname}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold',
                        isPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.currentValue.toFixed(2)} CHF
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        stock.change === 0 ? 'text-gray-500' : isPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.change > 0 ? '+' : ''}
                      {stock.change.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                         stock.percentChange === 0 ? 'text-gray-500' : isPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.percentChange > 0 ? '+' : ''}
                      {stock.percentChange.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-auto">
        <NewsTicker stocks={stocks || []} />
      </div>
    </div>
  );
}
