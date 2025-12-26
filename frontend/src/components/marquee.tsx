'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import { generateHeadlinesAiGenerateHeadlinesPost } from '@/lib/api/client';
import type { StockResponse } from '@/lib/api/client';
import {
  StockPrice,
  PercentChange,
  TickerSymbol,
  ChangeArrow,
  COLORS,
} from '@/components/display';
import '@/components/display/marquee.css';
import { TIMINGS } from '@/constants/timings';

/**
 * Base marquee component with Bloomberg terminal styling.
 * Horizontally scrolling text with configurable content.
 */
function Marquee({
  children,
  duration = 30,
  className = '',
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden border-y border-border bg-black ${className}`}>
      <div
        className="flex animate-marquee whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        {children}
        <span aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}

/**
 * Stock price marquee - displays real-time stock prices scrolling horizontally.
 * Same style as the ticker view.
 */
export function StockMarquee({ speed = 1 }: { speed?: number }) {
  const { stocks, isLoading } = useStocks();

  const repeatedContent = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    const repeatCount = Math.max(2, Math.ceil(40 / stocks.length));
    return Array(repeatCount)
      .fill(stocks)
      .flat()
      .map((stock: StockResponse, index: number) => (
        <span key={`${stock.ticker}-${index}`} className="flex items-center">
          <span className="text-muted-foreground mx-2">│</span>
          <TickerSymbol ticker={stock.ticker} size="sm" variant="primary" />
          <StockPrice
            value={stock.price}
            change={stock.change}
            glow
            size="sm"
            className="ml-2"
          />
          <span className="text-muted-foreground text-xs ml-1">CHF</span>
          <ChangeArrow value={stock.change} size="sm" className="ml-1" />
          <PercentChange
            value={stock.percent_change}
            size="sm"
            className="ml-0.5"
          />
        </span>
      ));
  }, [stocks]);

  if (isLoading && stocks.length === 0) {
    return (
      <div className="w-full h-8 flex items-center justify-center bg-black text-primary border-y border-border">
        <span className="text-sm">▌ LADE KURSDATEN... ▐</span>
      </div>
    );
  }

  if (!repeatedContent) return null;

  const baseDuration = (stocks?.length || 10) * 4;
  const animationDuration = baseDuration / speed;

  return (
    <div className="h-8 flex items-center bg-black text-sm shrink-0 overflow-hidden">
      <Marquee duration={animationDuration}>{repeatedContent}</Marquee>
    </div>
  );
}

/**
 * Parse headline markup and return styled React elements using display components
 */
function parseHeadlineMarkup(headline: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  const patterns = ['title', 'symbol', 'price', 'percent'];

  while (currentIndex < headline.length) {
    let foundMatch = false;

    for (const tag of patterns) {
      const openTag = `[${tag}]`;
      const closeTag = `[/${tag}]`;

      if (headline.slice(currentIndex).startsWith(openTag)) {
        const closeIndex = headline.indexOf(closeTag, currentIndex);
        if (closeIndex !== -1) {
          const content = headline.slice(currentIndex + openTag.length, closeIndex);

          // Use appropriate display component for each tag
          if (tag === 'symbol') {
            parts.push(
              <TickerSymbol key={key++} ticker={content} size="sm" variant="primary" />
            );
          } else if (tag === 'price') {
            // Extract numeric value and handle CHF suffix
            const priceMatch = content.match(/([\d.]+)\s*CHF/);
            const priceValue = priceMatch ? parseFloat(priceMatch[1]) : parseFloat(content);
            parts.push(
              <StockPrice
                key={key++}
                value={priceValue}
                change={0}
                glow
                size="sm"
                className="ml-2"
              />
            );
            parts.push(
              <span key={key++} className="text-muted-foreground text-xs ml-1">CHF</span>
            );
          } else if (tag === 'percent') {
            // Extract numeric value and determine if positive/negative
            const percentMatch = content.match(/([+-]?[\d.]+)%/);
            const percentValue = percentMatch ? parseFloat(percentMatch[1]) : 0;
            parts.push(
              <ChangeArrow key={key++} value={percentValue} size="sm" className="ml-1" />
            );
            parts.push(
              <PercentChange
                key={key++}
                value={percentValue}
                size="sm"
                className="ml-0.5"
              />
            );
          } else if (tag === 'title') {
            parts.push(
              <span key={key++} className="text-primary font-bold">
                {content}
              </span>
            );
          }

          currentIndex = closeIndex + closeTag.length;
          foundMatch = true;
          break;
        }
      }
    }

    if (!foundMatch) {
      // Find the next tag or end of string
      let nextTagIndex = headline.length;
      for (const tag of patterns) {
        const index = headline.indexOf(`[${tag}]`, currentIndex);
        if (index !== -1 && index < nextTagIndex) {
          nextTagIndex = index;
        }
      }

      const text = headline.slice(currentIndex, nextTagIndex);
      if (text) {
        parts.push(<span key={key++}>{text}</span>);
      }
      currentIndex = nextTagIndex;

      if (currentIndex >= headline.length) break;
    }
  }

  return <span key={key++} className="flex items-center">{parts}</span>;
}

/**
 * Headlines marquee - displays AI-generated news headlines scrolling horizontally.
 * Loads headlines in batches and manages smooth scrolling without jumps.
 */
export function HeadlinesMarquee({ speed = 1 }: { speed?: number }) {
  const { stocks } = useStocks();
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const hasLoadedAi = useRef(false);
  const hasFetchedOnMount = useRef(false);
  const nextFetchIndex = useRef(0);

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
      const arrow = stock.percent_change >= 0 ? '▲' : '▼';
      return `${arrow} ${stock.title} (${stock.ticker}) ${direction} um ${Math.abs(stock.percent_change).toFixed(2)}%`;
    });
  }, [stocks]);

  // Initialize with fallback headlines
  useEffect(() => {
    if (headlines.length === 0 && fallbackHeadlines.length > 0) {
      setHeadlines(fallbackHeadlines);
    }
  }, [fallbackHeadlines, headlines.length]);

  // Fetch AI headlines and append to queue
  const fetchHeadlines = useCallback(async () => {
    if (isFetching) return;

    setIsFetching(true);
    try {
      const response = await generateHeadlinesAiGenerateHeadlinesPost({
        query: { count: 5 },
      });
      if (response.data?.headlines && response.data.headlines.length > 0) {
        const newHeadlines = response.data.headlines;

        setHeadlines((prev) => {
          if (!hasLoadedAi.current) {
            hasLoadedAi.current = true;
            return newHeadlines;
          }
          // Append new headlines to the end
          return [...prev, ...newHeadlines];
        });
      }
    } catch {
      // Keep current headlines on error
    } finally {
      setIsFetching(false);
    }
  }, [isFetching]);

  // Fetch headlines on mount and periodically
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      fetchHeadlines();
    }

    // Fetch new headlines periodically
    const interval = setInterval(() => {
      fetchHeadlines();
    }, TIMINGS.headlineRefresh);

    return () => clearInterval(interval);
  }, [fetchHeadlines]);

  // Parse and memoize headlines to avoid re-parsing on every render
  const parsedHeadlines = useMemo(() => {
    // Show only the next 10 headlines in rotation
    const displayCount = Math.min(10, headlines.length);
    const startIndex = nextFetchIndex.current % headlines.length;
    const toDisplay = [...headlines.slice(startIndex, startIndex + displayCount)];

    // If we need to wrap around, add from the beginning
    if (toDisplay.length < displayCount) {
      toDisplay.push(...headlines.slice(0, displayCount - toDisplay.length));
    }

    return toDisplay.map((headline) => ({
      text: headline,
      parsed: parseHeadlineMarkup(headline),
    }));
  }, [headlines]);

  // Calculate animation duration based on number of headlines
  const baseDuration = Math.max(60, parsedHeadlines.length * 15);
  const animationDuration = baseDuration / speed;

  const marqueeContent = useMemo(() => {
    if (parsedHeadlines.length === 0) return null;

    return parsedHeadlines.map(({ text, parsed }, index) => (
      <span key={`headline-${text.substring(0, 30)}-${index}`} className="flex items-center">
        <span className="text-muted-foreground mx-8">+++</span>
        <span className="tracking-wide whitespace-nowrap inline-flex items-baseline gap-0.5 leading-none">
          {parsed}
        </span>
      </span>
    ));
  }, [parsedHeadlines]);

  if (!marqueeContent) return null;

  return (
    <div className="h-8 flex items-center bg-black text-sm shrink-0 overflow-hidden">
      <Marquee duration={animationDuration}>
        {marqueeContent}
        {marqueeContent}
      </Marquee>
    </div>
  );
}
