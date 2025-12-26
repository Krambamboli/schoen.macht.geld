'use client';

import { LeaderboardPanel } from '@/components/panels';

/**
 * Leaderboard display page - uses the LeaderboardPanel component
 */
export default function LeaderboardClient() {
  return (
    <LeaderboardPanel
      className="h-full"
      hideHeader
    />
  );
}
