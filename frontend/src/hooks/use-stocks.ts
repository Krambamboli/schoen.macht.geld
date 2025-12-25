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
      refreshInterval: 2000,
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    }
  );

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
    ticker ? `stock-${ticker}` : null,
    async () => {
      if (!ticker) return null;
      const response = await getStockStocksTickerGet({
        path: { ticker },
      });
      return response.data;
    },
    {
      refreshInterval: 2000,
      revalidateOnFocus: false,
    }
  );

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
    ticker ? `snapshots-${ticker}-${limit}` : null,
    async () => {
      if (!ticker) return undefined;
      const response = await getStockSnapshotsStocksTickerSnapshotsGet({
        path: { ticker },
        query: { limit },
      });
      return response.data;
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
    }
  );

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
  [ticker: string]: number | string; // ticker -> normalized price (0-100)
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

export function useRaceData(count = 5, snapshotLimit = 50) {
  const { stocks } = useStocks({ order: 'rank', limit: count });

  const { data, error, isLoading } = useSWR(
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

      // Find all unique timestamps and normalize the data
      // We'll create data points at each timestamp where any stock has data
      const timestampMap = new Map<string, Record<string, number>>();

      allSnapshots.forEach((snapshots, stockIndex) => {
        const ticker = stocks[stockIndex].ticker;
        // Get min/max for this stock to normalize to 0-100
        const prices = snapshots.map((s) => s.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;

        snapshots.forEach((snapshot) => {
          const ts = snapshot.created_at;
          if (!timestampMap.has(ts)) {
            timestampMap.set(ts, {});
          }
          // Normalize price to 0-100 range for fair comparison
          const normalized = ((snapshot.price - minPrice) / range) * 100;
          timestampMap.get(ts)![ticker] = normalized;
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
          point[stock.ticker] = lastValues[stock.ticker] ?? 50;
        });

        raceData.push(point);
      });

      return { raceStocks, raceData };
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
    }
  );

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
