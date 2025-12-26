'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';

export interface MarketState {
  isOpen: boolean;
  snapshotCount: number;
  marketDayCount: number;
  updatedAt: string | null;
}

interface MarketContextType {
  marketState: MarketState;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | null>(null);

const DEFAULT_STATE: MarketState = {
  isOpen: false,
  snapshotCount: 0,
  marketDayCount: 0,
  updatedAt: null,
};

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketState, setMarketState] = useState<MarketState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastEvent } = useWebSocket();

  const fetchMarketState = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiUrl}/market/`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market state: ${response.status}`);
      }

      const data = await response.json();
      setMarketState({
        isOpen: data.is_open,
        snapshotCount: data.snapshot_count,
        marketDayCount: data.market_day_count,
        updatedAt: data.updated_at,
      });
      setError(null);
    } catch (err) {
      console.error('[MarketContext] Failed to fetch market state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial state
  useEffect(() => {
    fetchMarketState();
  }, [fetchMarketState]);

  // Update on market_open/market_close events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event_type === 'market_open') {
      setMarketState(prev => ({
        ...prev,
        isOpen: true,
        snapshotCount: 0,
        marketDayCount: lastEvent.metadata?.market_day as number ?? prev.marketDayCount,
        updatedAt: new Date().toISOString(),
      }));
    } else if (lastEvent.event_type === 'market_close') {
      setMarketState(prev => ({
        ...prev,
        isOpen: false,
        marketDayCount: lastEvent.metadata?.market_day as number ?? prev.marketDayCount,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [lastEvent]);

  return (
    <MarketContext.Provider
      value={{
        marketState,
        isLoading,
        error,
        refetch: fetchMarketState,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}