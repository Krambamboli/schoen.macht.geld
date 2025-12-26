'use client';

import { useEvents } from '@/contexts/events-context';
import { NewLeaderCelebration } from './new-leader-celebration';
import { AllTimeHigh } from './all-time-high';
import { BigCrash } from './big-crash';
import { MarketOpen } from './market-open';
import { MarketClose } from './market-close';

/**
 * EventsLayer renders event animations when they occur.
 * It reads from EventsContext and displays the appropriate animation.
 */
export function EventsLayer() {
  const { currentEvent, dismissEvent, eventsEnabled } = useEvents();

  if (!eventsEnabled || !currentEvent) {
    return null;
  }

  switch (currentEvent.type) {
    case 'new_leader':
      return <NewLeaderCelebration event={currentEvent} onComplete={dismissEvent} />;
    case 'all_time_high':
      return <AllTimeHigh event={currentEvent} onComplete={dismissEvent} />;
    case 'big_crash':
      return <BigCrash event={currentEvent} onComplete={dismissEvent} />;
    case 'market_open':
      return <MarketOpen event={currentEvent} onComplete={dismissEvent} />;
    case 'market_close':
      return <MarketClose event={currentEvent} onComplete={dismissEvent} />;
    default:
      return null;
  }
}