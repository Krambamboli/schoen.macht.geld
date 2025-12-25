'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
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
    previousLeaderTicker?: string;
    crashPercent?: number;
    previousPrice?: number;
    newPrice?: number;
    previousHigh?: number;
    newHigh?: number;
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

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [currentEvent, setCurrentEvent] = useState<StockEvent | null>(null);
  const [eventQueue, setEventQueue] = useState<StockEvent[]>([]);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // WebSocket for receiving server-side events
  const { lastEvent } = useWebSocket();

  // Track state for market_open detection (still client-side for now)
  const lastSeenSnapshotRef = useRef<string | null>(null);
  const marketOpenTriggeredForDateRef = useRef<string | null>(null);

  // Fetch stocks for market_open detection
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

  // Listen for WebSocket events (new_leader, all_time_high, big_crash)
  useEffect(() => {
    if (!eventsEnabled || !lastEvent) return;

    const wsEvent = lastEvent;
    if (wsEvent.event_type === 'new_leader' || wsEvent.event_type === 'all_time_high' || wsEvent.event_type === 'big_crash') {
      queueEvent({
        type: wsEvent.event_type as EventType,
        stock: wsEvent.stock,
        metadata: {
          previousLeaderTicker: wsEvent.metadata?.previous_leader_ticker as string | undefined,
          crashPercent: wsEvent.metadata?.crash_percent as number | undefined,
          previousHigh: wsEvent.metadata?.previous_high as number | undefined,
          newHigh: wsEvent.metadata?.new_high as number | undefined,
        },
      });
    }
  }, [lastEvent, eventsEnabled, queueEvent]);

  // Monitor snapshots for market open (new trading day) - still client-side
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
