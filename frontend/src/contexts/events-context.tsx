'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import type { StockResponse } from '@/lib/api/client';

export type EventType = 'new_leader' | 'all_time_high' | 'big_crash' | 'market_open' | 'market_close';

export interface StockEvent {
  id: string;
  type: EventType;
  stock?: StockResponse;
  timestamp: number;
  metadata?: {
    previousLeader?: StockResponse;
    previousLeaderTicker?: string;
    crashPercent?: number;
    previousPrice?: number;
    newPrice?: number;
    previousHigh?: number;
    newHigh?: number;
    marketDay?: number;
    snapshotsPerDay?: number;
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
  const [eventsEnabled, setEventsEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // WebSocket for receiving server-side events
  const { lastEvent } = useWebSocket();

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

  // Listen for WebSocket events
  useEffect(() => {
    if (!eventsEnabled || !lastEvent) return;

    const wsEvent = lastEvent;
    const eventType = wsEvent.event_type;

    // Handle all known event types from backend
    if (
      eventType === 'new_leader' ||
      eventType === 'all_time_high' ||
      eventType === 'big_crash' ||
      eventType === 'market_open' ||
      eventType === 'market_close'
    ) {
      // Use stock if present, otherwise use leader (for market_close)
      const stock = wsEvent.stock ?? wsEvent.leader;

      queueEvent({
        type: eventType as EventType,
        stock,
        metadata: {
          previousLeaderTicker: wsEvent.metadata?.previous_leader_ticker as string | undefined,
          crashPercent: wsEvent.metadata?.crash_percent as number | undefined,
          previousHigh: wsEvent.metadata?.previous_high as number | undefined,
          newHigh: wsEvent.metadata?.new_high as number | undefined,
          marketDay: wsEvent.metadata?.market_day as number | undefined,
          snapshotsPerDay: wsEvent.metadata?.snapshots_per_day as number | undefined,
        },
      });
    }
  }, [lastEvent, eventsEnabled, queueEvent]);

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
