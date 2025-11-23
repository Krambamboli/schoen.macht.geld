
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
import { useEffect, useState } from 'react';

type StockWithChange = Stock & { change: number; percentChange: number };

const NewsTicker = ({ stocks }: { stocks: StockWithChange[] }) => {
  const [headline, setHeadline] = useState(
    'Welcome to the MachtSchön Börse News Network.'
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchHeadline = async () => {
      if (isGenerating || stocks.length === 0) return;

      setIsGenerating(true);
      try {
        // Find a "trending" stock (e.g., biggest change)
        const trendingStock = [...stocks].sort(
          (a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange)
        )[0];

        if (trendingStock && trendingStock.change !== 0) {
          const result = await generateFunnyNewsHeadline({
            stockTicker: trendingStock.ticker,
            companyName: trendingStock.nickname,
            description: trendingStock.description,
            currentValue: trendingStock.value,
            change: trendingStock.change,
            percentChange: trendingStock.percentChange,
          });
          setHeadline(
            `${trendingStock.ticker.toUpperCase()}: ${result.headline}`
          );
        } else {
           setHeadline('Market is quiet... too quiet. What are you waiting for?');
        }
      } catch (error) {
        console.error('Failed to generate news headline:', error);
        setHeadline('NEWS: Market is experiencing technical difficulties... or is it just feelings?');
      } finally {
        setIsGenerating(false);
      }
    };

    // Don't fetch on first render, wait for some data
    if (stocks.length > 0) {
        fetchHeadline();
    }

    const interval = setInterval(fetchHeadline, 15000); // Generate new headline every 15 seconds
    return () => clearInterval(interval);
  }, [stocks, isGenerating]);

  return (
    <div className="w-full bg-red-700 text-white h-10 flex items-center overflow-hidden">
      <div className="flex animate-marquee-fast whitespace-nowrap">
        <p className="text-xl font-bold mx-12">{headline}</p>
        <p className="text-xl font-bold mx-12">{headline}</p>
      </div>
       <style jsx>{`
        @keyframes marquee-fast {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee-fast {
            animation: marquee-fast 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default function TerminalClient() {
    const [stocks, setStocks] = useState<StockWithChange[]>([]);

    useEffect(() => {
        const loadData = () => {
            const storedStocks: Stock[] = JSON.parse(localStorage.getItem('stocks') || '[]');
            
            const stocksWithChange = storedStocks.map(s => ({
                ...s,
                change: s.change || 0,
                percentChange: s.percentChange || 0,
            }));

            setStocks(stocksWithChange as StockWithChange[]);
        };
        
        loadData();
        const dataInterval = setInterval(loadData, 2000);
        
        return () => {
            clearInterval(dataInterval);
        };
    }, []);

  return (
    <div className="h-full flex flex-col p-2 bg-black text-green-400 font-mono">
      <div className="flex justify-between items-center text-yellow-400 border-b-2 border-yellow-400 pb-1">
        <h1 className="text-2xl">MSB TERMINAL</h1>
      </div>
      <div className="flex-1 overflow-y-auto mt-2">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-900">
              <TableHead className="text-yellow-400">TICKER</TableHead>
              <TableHead className="text-yellow-400">NICKNAME</TableHead>
              <TableHead className="text-yellow-400 text-right">VALUE</TableHead>
              <TableHead className="text-yellow-400 text-right">CHG</TableHead>
              <TableHead className="text-yellow-400 text-right">% CHG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks
              .sort((a, b) => b.value - a.value)
              .map((stock) => {
                const isPositive = stock.change >= 0;
                return (
                  <TableRow
                    key={stock.id}
                    className="border-gray-800 hover:bg-gray-900/50"
                  >
                    <TableCell className="font-bold">{stock.ticker}</TableCell>
                    <TableCell>{stock.nickname}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold',
                        isPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      ${stock.value.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        isPositive ? 'text-green-400' : 'text-red-500'
                      )}
                    >
                      {stock.change > 0 ? '+' : ''}
                      {stock.change.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                         isPositive ? 'text-green-400' : 'text-red-500'
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
        <NewsTicker stocks={stocks} />
      </div>
    </div>
  );
}
