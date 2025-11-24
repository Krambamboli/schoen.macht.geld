'use client';

import { generateFunnyNewsHeadlinesBatch } from '@/ai/flows/generate-funny-news-headlines';
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
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

/**
 * A custom hook that returns the value of a variable from the previous render.
 * @param value The value to track.
 * @returns The value from the previous render.
 */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }); // No dependency array: runs after every render.
  return ref.current;
}


/**
 * A component that displays a scrolling news ticker with AI-generated headlines.
 * It fetches a batch of 5 headlines every 5 minutes and cycles through them.
 * @param {object} props - The component props.
 * @param {Stock[]} props.stocks - The array of current stocks.
 * @returns {JSX.Element} The rendered news ticker component.
 */
const NewsTicker = ({ stocks }: { stocks: Stock[] }) => {
  const [headlines, setHeadlines] = useState<string[]>(['Willkommen beim Schön. Macht. Geld. News Network.']);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Fetches a new batch of headlines from the AI flow. It identifies the top 5
   * "trending" stocks (most volatile) and generates headlines for them.
   */
  const fetchHeadlinesBatch = useCallback(async () => {
    if (isGenerating || !stocks || stocks.length === 0) return;
    setIsGenerating(true);

    try {
      // Find the top 5 stocks with the largest absolute percentage change.
      const trendingStocks = [...stocks]
        .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
        .slice(0, 5);

      if (trendingStocks.length > 0) {
        const result = await generateFunnyNewsHeadlinesBatch({
          stocks: trendingStocks.map(stock => ({
            stockTicker: stock.ticker,
            companyName: stock.nickname,
            description: stock.description,
            currentValue: stock.currentValue,
            change: stock.change,
            percentChange: stock.percentChange,
          }))
        });
        
        if (result.headlines && result.headlines.length > 0) {
            setHeadlines(result.headlines);
            setHeadlineIndex(0); // Reset to the first new headline
        }

      }
    } catch (error) {
      console.error('Failed to generate news headlines batch:', error);
      setHeadlines(['NEWS: Der Markt hat technische Schwierigkeiten... oder sind es nur Gefühle?']);
    } finally {
      setIsGenerating(false);
    }
  }, [stocks, isGenerating]);


  // Set up an interval to fetch a new batch of headlines every 5 minutes.
  useEffect(() => {
    const fetchInterval = setInterval(fetchHeadlinesBatch, 300000); // 5 minutes
    fetchHeadlinesBatch(); // Fetch immediately on mount
    return () => clearInterval(fetchInterval);
  }, [fetchHeadlinesBatch]);

  // Set up an interval to cycle through the available headlines.
  useEffect(() => {
    if (headlines.length > 1) {
        const headlineCycleInterval = setInterval(() => {
            setHeadlineIndex(prevIndex => (prevIndex + 1) % headlines.length);
        }, 30000); // Change headline every 30 seconds
        return () => clearInterval(headlineCycleInterval);
    }
  }, [headlines]);

  // Use a key on the animated div to force a re-render (and restart the animation) when the headline changes.
  const currentHeadline = headlines[headlineIndex];

  return (
    <div className="w-full bg-red-700 text-white h-10 flex items-center overflow-hidden">
       {currentHeadline && (
         <div
            key={currentHeadline} // This is the key!
            className="flex animate-marquee-fast whitespace-nowrap"
            style={{ animationDuration: '45s' }}
          >
            <span className="text-xl font-bold px-12">{currentHeadline}</span>
            <span className="text-xl font-bold px-12" aria-hidden="true">{currentHeadline}</span>
        </div>
       )}
      <style jsx>{`
        @keyframes marquee-fast {
          from { transform: translateX(0%); }
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
    
    const sortedStocks = useMemo(() => {
      return stocks ? [...stocks].sort((a, b) => b.currentValue - a.currentValue) : [];
    }, [stocks]);

    const prevSortedStocks = usePrevious(sortedStocks);
    
    const rankChanges = useMemo(() => {
        const changes = new Map<string, 'up' | 'down' | 'same'>();
        if (!prevSortedStocks || prevSortedStocks.length === 0 || sortedStocks.length === 0) {
            sortedStocks.forEach(stock => changes.set(stock.id, 'same'));
            return changes;
        }

        const prevRanks = new Map(prevSortedStocks.map((stock, index) => [stock.id, index]));
        
        sortedStocks.forEach((stock, newRank) => {
            const prevRank = prevRanks.get(stock.id);
            if (prevRank === undefined) {
                changes.set(stock.id, 'same'); // New entry
            } else if (newRank < prevRank) {
                changes.set(stock.id, 'up'); // Moved up
            } else if (newRank > prevRank) {
                changes.set(stock.id, 'down'); // Moved down
            } else {
                changes.set(stock.id, 'same'); // Unchanged
            }
        });
        
        return changes;
    }, [sortedStocks, prevSortedStocks]);


  return (
    <div className="h-full flex flex-col p-2 bg-black text-green-400 font-mono overflow-hidden">
      <div className="flex justify-between items-center text-yellow-400 border-b-2 border-yellow-400 pb-1">
        <h1 className="text-2xl">SMG TERMINAL</h1>
      </div>
      <div className="flex-1 overflow-y-auto mt-1">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-900">
              <TableHead className="text-yellow-400 w-12 px-1 h-6 py-0"></TableHead>
              <TableHead className="text-yellow-400 px-1 h-6 py-0">TICKER</TableHead>
              <TableHead className="text-yellow-400 px-1 h-6 py-0">NICKNAME</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">WERT</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">CHG (5M)</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">% CHG (5M)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStocks
              .map((stock) => {
                const changeLast5MinPositive = (stock.valueChangeLast5Minutes ?? 0) >= 0;
                const rankChange = rankChanges.get(stock.id) || 'same';

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
                    <TableCell className="w-12 px-1 py-0">{RankIndicator}</TableCell>
                    <TableCell className="font-bold px-1 py-0">{stock.ticker}</TableCell>
                    <TableCell className="px-1 py-0 truncate max-w-xs">{stock.nickname}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold px-1 py-0',
                        stock.change >= 0 ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.currentValue.toFixed(2)} CHF
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right px-1 py-0',
                        (stock.valueChangeLast5Minutes ?? 0) === 0 ? 'text-gray-500' : changeLast5MinPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {(stock.valueChangeLast5Minutes ?? 0) >= 0 ? '+' : ''}
                      {(stock.valueChangeLast5Minutes ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right px-1 py-0',
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

    