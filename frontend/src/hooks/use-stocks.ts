import { useEffect, useCallback } from 'react';
import useSWR from 'swr';
import {
  listStocksStocksGet,
  getStockStocksTickerGet,
  getStockSnapshotsStocksTickerSnapshotsGet,
  swipeSwipePost,
} from '@/lib/api';
import type { StockOrder, StockResponse, StockSnapshotResponse, SwipeDirection } from '@/lib/api/client';

// Fallback data for resilience
const FALLBACK_STOCKS: StockResponse[] = [];

// Sync interval in milliseconds - used as fallback when WebSocket is unavailable
// With WebSocket push, this is just a safety net for missed updates
const SYNC_INTERVAL_MS = 60000;

/**
 * Calculate milliseconds until the next synchronized refresh time.
 * All clients will refresh at the same wall clock moments.
 */
function getMsUntilNextSync(intervalMs: number): number {
  const now = Date.now();
  const msIntoInterval = now % intervalMs;
  return intervalMs - msIntoInterval;
}

/**
 * Hook that calls a revalidation callback at synchronized wall clock times.
 */
function useSyncedRevalidation(revalidate: () => void, intervalMs: number = SYNC_INTERVAL_MS): void {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const msUntilNext = getMsUntilNextSync(intervalMs);
      timeoutId = setTimeout(() => {
        revalidate();
        scheduleNext();
      }, msUntilNext);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [revalidate, intervalMs]);
}

export interface UseStocksOptions {
  limit?: number;
  order?: StockOrder;
}

export function useStocks(options?: UseStocksOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['stocks', options?.limit, options?.order],
    async () => {
      const response = await listStocksStocksGet({
        query: { limit: options?.limit, order: options?.order },
      });
      return response.data;
    },
    {
      fallbackData: FALLBACK_STOCKS,
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    }
  );

  // Sync revalidation to wall clock
  const revalidate = useCallback(() => mutate(), [mutate]);
  useSyncedRevalidation(revalidate);

  return {
    stocks: data ?? FALLBACK_STOCKS,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useStock(ticker: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? ['stock', ticker] : null,
    async () => {
      if (!ticker) return null;
      const response = await getStockStocksTickerGet({
        path: { ticker },
      });
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Sync revalidation to wall clock
  const revalidate = useCallback(() => mutate(), [mutate]);
  useSyncedRevalidation(revalidate);

  return {
    stock: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useStockSnapshots(ticker: string | null, limit = 100) {
  const { data, error, isLoading, mutate } = useSWR<StockSnapshotResponse[] | undefined>(
    ticker ? ['snapshots', ticker, limit] : null,
    async () => {
      if (!ticker) return undefined;
      const response = await getStockSnapshotsStocksTickerSnapshotsGet({
        path: { ticker },
        query: { limit },
      });
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Sync revalidation to wall clock
  const revalidate = useCallback(() => mutate(), [mutate]);
  useSyncedRevalidation(revalidate);

  return {
    snapshots: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Race data for performance race view
export interface RaceDataPoint {
  timestamp: string;
  [ticker: string]: number | string; // ticker -> actual price
}

export interface RaceStock {
  ticker: string;
  title: string;
  image: string | null;
  color: string;
  currentPrice: number;
  percentChange: number;
}

const RACE_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
];

// Fallback sync interval for race data (with WebSocket, this is just a safety net)
const RACE_SYNC_INTERVAL_MS = 60000;

export function useRaceData(count = 5, snapshotLimit = 30) {
  const { stocks } = useStocks({ order: 'rank', limit: count });

  const { data, error, isLoading, mutate } = useSWR(
    stocks.length > 0 ? ['race-data', stocks.map((s) => s.ticker).join(','), snapshotLimit] : null,
    async () => {
      // Fetch snapshots for all stocks in parallel
      const snapshotPromises = stocks.map((stock) =>
        getStockSnapshotsStocksTickerSnapshotsGet({
          path: { ticker: stock.ticker },
          query: { limit: snapshotLimit },
        })
      );

      const results = await Promise.all(snapshotPromises);
      const allSnapshots = results.map((r) => r.data ?? []);

      // Build race stocks with colors
      const raceStocks: RaceStock[] = stocks.map((stock, i) => ({
        ticker: stock.ticker,
        title: stock.title,
        image: stock.image,
        color: RACE_COLORS[i % RACE_COLORS.length],
        currentPrice: stock.price,
        percentChange: stock.percent_change,
      }));

      // Find all unique timestamps and collect actual prices
      const timestampMap = new Map<string, Record<string, number>>();

      allSnapshots.forEach((snapshots, stockIndex) => {
        const ticker = stocks[stockIndex].ticker;

        snapshots.forEach((snapshot) => {
          const ts = snapshot.created_at;
          if (!timestampMap.has(ts)) {
            timestampMap.set(ts, {});
          }
          // Use actual price instead of normalized
          timestampMap.get(ts)![ticker] = snapshot.price;
        });
      });

      // Sort by timestamp and build the data array
      const sortedTimestamps = Array.from(timestampMap.keys()).sort();

      // Forward-fill missing values
      const raceData: RaceDataPoint[] = [];
      const lastValues: Record<string, number> = {};

      sortedTimestamps.forEach((ts) => {
        const point: RaceDataPoint = {
          timestamp: new Date(ts).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        stocks.forEach((stock) => {
          const value = timestampMap.get(ts)?.[stock.ticker];
          if (value !== undefined) {
            lastValues[stock.ticker] = value;
          }
          point[stock.ticker] = lastValues[stock.ticker] ?? stock.price;
        });

        raceData.push(point);
      });

      return { raceStocks, raceData };
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Sync revalidation to wall clock (slower for race data)
  const revalidate = useCallback(() => mutate(), [mutate]);
  useSyncedRevalidation(revalidate, RACE_SYNC_INTERVAL_MS);

  return {
    raceStocks: data?.raceStocks ?? [],
    raceData: data?.raceData ?? [],
    isLoading: isLoading || stocks.length === 0,
    isError: !!error,
    error,
  };
}

// Swipe action helper (not a hook, but useful utility)
export async function submitSwipe(
  ticker: string,
  direction: SwipeDirection,
  token?: string | null
) {
  const response = await swipeSwipePost({
    query: {
      ticker,
      direction,
      token,
    },
  });

  if (response.error) {
    throw new Error('Swipe failed');
  }

  return response.data;
}
