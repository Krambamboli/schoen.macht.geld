'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';
import { generateHeadlinesAiGenerateHeadlinesPost } from '@/lib/api/client';
import { FlashValue } from '@/components/flash-value';

const HEADLINE_SEPARATOR = ' +++ ';

/**
 * A component that displays a continuous scrolling news ticker.
 * All headlines scroll across the screen in sequence.
 * New headlines are appended when loaded, old ones continue scrolling.
 */
const NewsTicker = ({ stocks }: { stocks: StockResponse[] }) => {
  const [headlineQueue, setHeadlineQueue] = useState<string[]>([]);
  const hasLoadedAi = useRef(false);
  const hasFetchedOnMount = useRef(false);

  // Generate fallback headlines from top movers
  const fallbackHeadlines = useMemo(() => {
    if (!stocks || stocks.length === 0) {
      return ['Willkommen beim Schön. Macht. Geld. News Network.'];
    }

    const topMovers = [...stocks]
      .sort((a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change))
      .slice(0, 5);

    return topMovers.map((stock) => {
      const direction = stock.percent_change >= 0 ? 'steigt' : 'fällt';
      const emoji = stock.percent_change >= 0 ? '📈' : '📉';
      return `${emoji} ${stock.title} (${stock.ticker}) ${direction} um ${Math.abs(stock.percent_change).toFixed(2)}%`;
    });
  }, [stocks]);

  // Initialize with fallback headlines
  useEffect(() => {
    if (headlineQueue.length === 0 && fallbackHeadlines.length > 0) {
      setHeadlineQueue(fallbackHeadlines);
    }
  }, [fallbackHeadlines, headlineQueue.length]);

  // Fetch AI headlines and append to queue
  const fetchHeadlines = useCallback(async () => {
    try {
      const response = await generateHeadlinesAiGenerateHeadlinesPost({
        query: { count: 5 },
      });
      if (response.data?.headlines && response.data.headlines.length > 0) {
        const newHeadlines = response.data.headlines;
        if (!hasLoadedAi.current) {
          // First AI load: replace fallback headlines
          setHeadlineQueue(newHeadlines);
          hasLoadedAi.current = true;
        } else {
          // Subsequent loads: append new headlines
          setHeadlineQueue((prev) => [...prev, ...newHeadlines]);
        }
      }
    } catch {
      // Keep current headlines on error
    }
  }, []);

  // Fetch headlines on mount and every 2 minutes
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      fetchHeadlines();
    }

    const interval = setInterval(fetchHeadlines, 120000);
    return () => clearInterval(interval);
  }, [fetchHeadlines]);

  // Join all headlines into a single scrolling string
  const tickerText = headlineQueue.join(HEADLINE_SEPARATOR);
  // Animation duration scales with content length (roughly 10s per 100 chars)
  const animationDuration = Math.max(30, Math.ceil(tickerText.length / 10));

  return (
    <div className="w-full bg-red-700 text-white h-10 flex items-center overflow-hidden">
      <div
        className="flex animate-marquee whitespace-nowrap"
        style={{ animationDuration: `${animationDuration}s` }}
      >
        <span className="text-xl font-bold px-12">
          {tickerText}
          {HEADLINE_SEPARATOR}
        </span>
        <span className="text-xl font-bold px-12" aria-hidden="true">
          {tickerText}
          {HEADLINE_SEPARATOR}
        </span>
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
          animation: marquee ${animationDuration}s linear infinite;
        }
      `}</style>
    </div>
  );
};

// Auto-scroll speed in pixels per second
const AUTO_SCROLL_SPEED = 30;
// Pause at top/bottom in milliseconds
const SCROLL_PAUSE_MS = 2000;

/**
 * The main client component for the Terminal display. It resembles a financial
 * terminal, showing a table of all stocks with their values and changes.
 * It also includes a NewsTicker at the bottom.
 */
export default function TerminalClient() {
  const { stocks, isLoading } = useStocks();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  }, [stocks]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isAutoScrolling) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationId: number;
    let lastTime = performance.now();
    let isPaused = false;
    let pauseTimeout: NodeJS.Timeout;

    const scroll = (currentTime: number) => {
      if (isPaused) {
        animationId = requestAnimationFrame(scroll);
        return;
      }

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const scrollAmount = AUTO_SCROLL_SPEED * deltaTime;
      const maxScroll = container.scrollHeight - container.clientHeight;

      if (scrollDirection === 'down') {
        container.scrollTop += scrollAmount;
        // Check if reached bottom
        if (container.scrollTop >= maxScroll - 1) {
          isPaused = true;
          pauseTimeout = setTimeout(() => {
            setScrollDirection('up');
            isPaused = false;
          }, SCROLL_PAUSE_MS);
        }
      } else {
        container.scrollTop -= scrollAmount;
        // Check if reached top
        if (container.scrollTop <= 1) {
          isPaused = true;
          pauseTimeout = setTimeout(() => {
            setScrollDirection('down');
            isPaused = false;
          }, SCROLL_PAUSE_MS);
        }
      }

      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(pauseTimeout);
    };
  }, [isAutoScrolling, scrollDirection]);

  // Pause auto-scroll on user interaction
  const handleUserScroll = useCallback(() => {
    setIsAutoScrolling(false);
    // Resume after 5 seconds of no interaction
    const timeout = setTimeout(() => setIsAutoScrolling(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (isLoading && stocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-green-400 font-mono">
        Lade Terminal...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2 bg-black text-green-400 font-mono overflow-hidden">
      <div className="flex justify-between items-center text-yellow-400 border-b-2 border-yellow-400 pb-1">
        <h1 className="text-2xl">SMG TERMINAL</h1>
        <button
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className={cn(
            'text-xs px-2 py-1 rounded border',
            isAutoScrolling
              ? 'border-green-400 text-green-400'
              : 'border-gray-600 text-gray-600'
          )}
        >
          {isAutoScrolling ? 'AUTO ▼' : 'AUTO ○'}
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        onWheel={handleUserScroll}
        onTouchStart={handleUserScroll}
        className="flex-1 overflow-y-auto mt-1 scrollbar-thin scrollbar-thumb-green-800 scrollbar-track-transparent"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-900">
              <TableHead className="text-yellow-400 w-12 px-1 h-6 py-0"></TableHead>
              <TableHead className="text-yellow-400 px-1 h-6 py-0">TICKER</TableHead>
              <TableHead className="text-yellow-400 px-1 h-6 py-0">NAME</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">WERT</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">CHG</TableHead>
              <TableHead className="text-yellow-400 text-right px-1 h-6 py-0">% CHG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStocks.map((stock) => {
              const isPositive = stock.change >= 0;

              let RankIndicator;
              if (!stock.rank || !stock.previous_rank || stock.rank === stock.previous_rank) {
                RankIndicator = <Minus className="w-4 h-4 text-gray-600" />;
              } else if (stock.rank < stock.previous_rank) {
                RankIndicator = <ArrowUp className="w-4 h-4 text-green-400" />;
              } else {
                RankIndicator = <ArrowDown className="w-4 h-4 text-red-500" />;
              }

              return (
                <TableRow key={stock.ticker} className="border-gray-800 hover:bg-gray-900/50">
                  <TableCell className="w-12 px-1 py-0">{RankIndicator}</TableCell>
                  <TableCell className="font-bold px-1 py-0">{stock.ticker}</TableCell>
                  <TableCell className="px-1 py-0 truncate max-w-xs">{stock.title}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold px-1 py-0',
                      isPositive ? 'text-green-400' : 'text-red-500'
                    )}
                  >
                    <FlashValue
                      value={stock.price}
                      trackingKey={stock.ticker}
                      formatFn={(v) => `${Number(v).toFixed(2)} CHF`}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right px-1 py-0',
                      stock.change === 0
                        ? 'text-gray-500'
                        : isPositive
                          ? 'text-green-400'
                          : 'text-red-500'
                    )}
                  >
                    <FlashValue
                      value={stock.change}
                      trackingKey={stock.ticker}
                      formatFn={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}`}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right px-1 py-0',
                      stock.percent_change === 0
                        ? 'text-gray-500'
                        : isPositive
                          ? 'text-green-400'
                          : 'text-red-500'
                    )}
                  >
                    <FlashValue
                      value={stock.percent_change}
                      trackingKey={stock.ticker}
                      formatFn={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`}
                    />
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
