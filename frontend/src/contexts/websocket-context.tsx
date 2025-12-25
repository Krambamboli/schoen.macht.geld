'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import type { StockResponse } from '@/lib/api/client';

export type WebSocketEventType = 'new_leader' | 'all_time_high' | 'big_crash';

export interface WebSocketEvent {
  type: 'event';
  event_type: WebSocketEventType;
  stock: StockResponse;
  metadata?: Record<string, unknown>;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastEvent: WebSocketEvent | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const RECONNECT_DELAY = 3000;
const HEARTBEAT_INTERVAL = 30000;

function getWebSocketUrl(): string {
  if (typeof window === 'undefined') return '';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  // If absolute URL, convert http(s) to ws(s)
  if (apiUrl.startsWith('http')) {
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return `${wsUrl}/stocks/ws`;
  }

  // Relative URL - use current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${apiUrl}/stocks/ws`;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const { mutate } = useSWRConfig();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected to', wsUrl);
      setIsConnected(true);

      // Start heartbeat to keep connection alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      setIsConnected(false);

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Schedule reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      // Error will trigger onclose, which handles reconnection
    };

    ws.onmessage = (event) => {
      try {
        // Skip pong responses
        if (event.data === 'pong') {
          return;
        }

        const data = JSON.parse(event.data);
        console.debug('[WebSocket] Received:', data.type);

        if (data.type === 'stocks_update') {
          // Update SWR cache for stocks list
          // Match the cache key pattern from use-stocks.ts
          mutate(
            (key: unknown) => Array.isArray(key) && key[0] === 'stocks',
            data.stocks,
            { revalidate: false }
          );
        } else if (data.type === 'stock_update') {
          // Update single stock in cache
          mutate(['stock', data.stock.ticker], data.stock, { revalidate: false });

          // Also update the stock in any stocks list caches
          mutate(
            (key: unknown) => Array.isArray(key) && key[0] === 'stocks',
            (currentStocks: StockResponse[] | undefined) => {
              if (!currentStocks) return currentStocks;
              return currentStocks.map((s) =>
                s.ticker === data.stock.ticker ? data.stock : s
              );
            },
            { revalidate: false }
          );
        } else if (data.type === 'event') {
          // Market event - expose to EventsContext
          setLastEvent(data as WebSocketEvent);
        }
      } catch {
        // Ignore invalid JSON
      }
    };
  }, [mutate]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
