'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useStocks, useStockSnapshots } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';

export type EventType = 'new_leader' | 'all_time_high' | 'big_crash' | 'market_open';

export interface StockEvent {
  id: string;
  type: EventType;
  stock: StockResponse;
  timestamp: number;
  metadata?: {
    previousLeader?: StockResponse;
    crashPercent?: number;
    previousPrice?: number;
    newPrice?: number;
  };
}

interface EventsContextType {
  // Current active event being displayed
  currentEvent: StockEvent | null;
  // Queue of pending events
  eventQueue: StockEvent[];
  // Dismiss current event
  dismissEvent: () => void;
  // Enable/disable event animations
  eventsEnabled: boolean;
  setEventsEnabled: (enabled: boolean) => void;
  // Manually trigger an event (for testing)
  triggerEvent: (event: Omit<StockEvent, 'id' | 'timestamp'>) => void;
}

const EventsContext = createContext<EventsContextType | null>(null);

const STORAGE_KEY = 'smg-events-settings';
const CRASH_THRESHOLD = -10; // Trigger crash animation at -10% or worse

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [currentEvent, setCurrentEvent] = useState<StockEvent | null>(null);
  const [eventQueue, setEventQueue] = useState<StockEvent[]>([]);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Track previous state for comparison
  const previousStocksRef = useRef<Map<string, StockResponse>>(new Map());
  const previousLeaderRef = useRef<string | null>(null);
  const highestPricesRef = useRef<Map<string, number>>(new Map());
  const lastSeenSnapshotRef = useRef<string | null>(null);
  const marketOpenTriggeredForDateRef = useRef<string | null>(null);

  // Fetch stocks to monitor for events
  const { stocks } = useStocks({ order: 'rank', limit: 20 });

  // Fetch snapshots to detect market open (use first stock as reference)
  const firstTicker = stocks.length > 0 ? stocks[0].ticker : null;
  const { snapshots } = useStockSnapshots(firstTicker, 1);

  // Load settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        setEventsEnabled(settings.eventsEnabled ?? true);
      }
    } catch {
      // Ignore
    }
    setHydrated(true);
  }, []);

  // Save settings
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ eventsEnabled }));
    } catch {
      // Ignore
    }
  }, [eventsEnabled, hydrated]);

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Add event to queue
  const queueEvent = useCallback((event: Omit<StockEvent, 'id' | 'timestamp'>) => {
    const fullEvent: StockEvent = {
      ...event,
      id: generateEventId(),
      timestamp: Date.now(),
    };
    setEventQueue((prev) => [...prev, fullEvent]);
  }, [generateEventId]);

  // Manually trigger event
  const triggerEvent = useCallback((event: Omit<StockEvent, 'id' | 'timestamp'>) => {
    if (!eventsEnabled) return;
    queueEvent(event);
  }, [eventsEnabled, queueEvent]);

  // Dismiss current event and show next
  const dismissEvent = useCallback(() => {
    setCurrentEvent(null);
  }, []);

  // Process queue - show next event when current is dismissed
  useEffect(() => {
    if (currentEvent === null && eventQueue.length > 0) {
      const [next, ...rest] = eventQueue;
      setCurrentEvent(next);
      setEventQueue(rest);
    }
  }, [currentEvent, eventQueue]);

  // Monitor snapshots for market open (new trading day)
  useEffect(() => {
    if (!eventsEnabled || snapshots.length === 0 || stocks.length === 0) return;

    const latestSnapshot = snapshots[0];
    const snapshotTimestamp = latestSnapshot.created_at;

    // Get date string from snapshot (YYYY-MM-DD)
    const snapshotDate = new Date(snapshotTimestamp).toISOString().split('T')[0];

    // Check if this is a new snapshot we haven't seen before
    if (lastSeenSnapshotRef.current !== null && snapshotTimestamp !== lastSeenSnapshotRef.current) {
      // Check if we haven't triggered market open for this date yet
      if (marketOpenTriggeredForDateRef.current !== snapshotDate) {
        // New snapshot on a new date = market open
        const leader = stocks.find((s) => s.rank === 1) ?? stocks[0];
        queueEvent({
          type: 'market_open',
          stock: leader,
        });
        marketOpenTriggeredForDateRef.current = snapshotDate;
      }
    }

    lastSeenSnapshotRef.current = snapshotTimestamp;
  }, [snapshots, stocks, eventsEnabled, queueEvent]);

  // Monitor stocks for events
  useEffect(() => {
    if (!eventsEnabled || stocks.length === 0) return;

    const currentStocksMap = new Map(stocks.map((s) => [s.ticker, s]));

    // Check for new leader (rank #1 changed)
    const currentLeader = stocks.find((s) => s.rank === 1);
    if (currentLeader && previousLeaderRef.current !== null) {
      if (currentLeader.ticker !== previousLeaderRef.current) {
        const previousLeaderStock = previousStocksRef.current.get(previousLeaderRef.current);
        queueEvent({
          type: 'new_leader',
          stock: currentLeader,
          metadata: {
            previousLeader: previousLeaderStock,
          },
        });
      }
    }
    if (currentLeader) {
      previousLeaderRef.current = currentLeader.ticker;
    }

    // Check each stock for events
    stocks.forEach((stock) => {
      const prevStock = previousStocksRef.current.get(stock.ticker);
      const prevHighest = highestPricesRef.current.get(stock.ticker) ?? 0;

      // All-time high detection
      if (stock.price > prevHighest && prevHighest > 0) {
        queueEvent({
          type: 'all_time_high',
          stock,
          metadata: {
            previousPrice: prevHighest,
            newPrice: stock.price,
          },
        });
      }
      highestPricesRef.current.set(stock.ticker, Math.max(stock.price, prevHighest));

      // Big crash detection (significant drop since last check)
      if (prevStock && stock.percent_change <= CRASH_THRESHOLD) {
        // Only trigger if this is a new crash (wasn't already below threshold)
        if (prevStock.percent_change > CRASH_THRESHOLD) {
          queueEvent({
            type: 'big_crash',
            stock,
            metadata: {
              crashPercent: stock.percent_change,
              previousPrice: prevStock.price,
              newPrice: stock.price,
            },
          });
        }
      }
    });

    // Update previous state
    previousStocksRef.current = currentStocksMap;
  }, [stocks, eventsEnabled, queueEvent]);

  return (
    <EventsContext.Provider
      value={{
        currentEvent,
        eventQueue,
        dismissEvent,
        eventsEnabled,
        setEventsEnabled,
        triggerEvent,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}