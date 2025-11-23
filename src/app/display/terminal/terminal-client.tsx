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

/**
 * A component that displays a scrolling news ticker with AI-generated headlines.
 * Headlines are generated periodically based on the most volatile stock.
 * @param {object} props - The component props.
 * @param {Stock[]} props.stocks - The array of current stocks.
 * @returns {JSX.Element} The rendered news ticker component.
 */
const NewsTicker = ({ stocks }: { stocks: Stock[] }) => {
  const [currentHeadline, setCurrentHeadline] = useState(
    'Willkommen beim Schön. Macht. Geld. News Network.'
  );
  const [nextHeadline, setNextHeadline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  /**
   * Fetches a new headline from the AI flow. It identifies the "trending" stock
   * (most volatile) and generates a headline for it.
   */
  const fetchHeadline = useCallback(async () => {
    if (isGenerating || !stocks || stocks.length === 0) return;
    setIsGenerating(true);
    try {
      // Find the stock with the largest absolute percentage change.
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

  // Set up an interval to fetch a new headline periodically.
  useEffect(() => {
    // Run it once immediately at the start.
    const interval = setInterval(fetchHeadline, 30000); // Generate a new headline every 30s
    return () => clearInterval(interval);
  }, [fetchHeadline]);

  /**
   * This function is called when the CSS animation completes an iteration.
   * It seamlessly swaps the `currentHeadline` with the `nextHeadline` that
   * has been pre-fetched in the background.
   */
  const handleAnimationIteration = useCallback(() => {
    if (nextHeadline) {
      setCurrentHeadline(nextHeadline);
      setNextHeadline(''); // Clear next headline so we can fetch a new one
      // The fetchHeadline interval will eventually call and set a new nextHeadline
    }
  }, [nextHeadline]);

  // Add and remove the event listener for the animation iteration.
  useEffect(() => {
    const tickerElement = tickerRef.current;
    if (tickerElement) {
      tickerElement.addEventListener('animationiteration', handleAnimationIteration);
      return () => {
        if (tickerElement) {
          tickerElement.removeEventListener('animationiteration', handleAnimationIteration);
        }
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
          animation: marquee-fast 45s linear infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * The main client component for the Terminal display. It resembles a financial
 * terminal, showing a table of all stocks with their values and changes.
 * It also includes the AI-powered NewsTicker at the bottom.
 * @returns {JSX.Element} The rendered terminal client component.
 */
export default function TerminalClient() {
    const { firestore } = useFirebase();
    const titlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'titles') : null, [firestore]);
    const { data: stocks } = useCollection<Stock>(titlesCollection);
    const prevRanksRef = useRef<Map<string, number>>(new Map());

    // Sort stocks by current value to establish ranking.
    const sortedStocks = stocks ? [...stocks].sort((a, b) => b.currentValue - a.currentValue) : [];

    const currentRanks = new Map<string, number>();
    sortedStocks.forEach((stock, index) => {
        currentRanks.set(stock.id, index);
    });

    /**
     * Determines the rank change of a stock compared to the previous render.
     * @param {string} stockId - The ID of the stock.
     * @param {number} currentRank - The stock's current rank in the sorted list.
     * @returns {'up' | 'down' | 'same'} The direction of rank change.
     */
    const getRankChange = (stockId: string, currentRank: number) => {
      if (!prevRanksRef.current.has(stockId)) {
          return 'same';
      }
      const prevRank = prevRanksRef.current.get(stockId)!;
      if (currentRank < prevRank) return 'up';
      if (currentRank > prevRank) return 'down';
      return 'same';
    };
    
    // After each render, save the current rankings to the ref for the next comparison.
    useEffect(() => {
      prevRanksRef.current = currentRanks;
    });


  return (
    <div className="h-full flex flex-col p-2 bg-black text-green-400 font-mono overflow-hidden">
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
              <TableHead className="text-yellow-400 text-right">CHG (5M)</TableHead>
              <TableHead className="text-yellow-400 text-right">% CHG (5M)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStocks
              .map((stock, index) => {
                const changeLast5MinPositive = (stock.valueChangeLast5Minutes ?? 0) >= 0;
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
                        stock.change >= 0 ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.currentValue.toFixed(2)} CHF
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        (stock.valueChangeLast5Minutes ?? 0) === 0 ? 'text-gray-500' : changeLast5MinPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {(stock.valueChangeLast5Minutes ?? 0) >= 0 ? '+' : ''}
                      {(stock.valueChangeLast5Minutes ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                         (stock.percentChangeLast5Minutes ?? 0) === 0 ? 'text-gray-500' : changeLast5MinPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {(stock.percentChangeLast5Minutes ?? 0) >= 0 ? '+' : ''}
                      {(stock.percentChangeLast5Minutes ?? 0).toFixed(2)}%
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
