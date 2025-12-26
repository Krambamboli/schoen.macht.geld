'use client';

import { PerformanceRacePanel } from '@/components/panels';

/**
 * Performance Race display page - uses the PerformanceRacePanel component
 */
export default function PerformanceRaceClient() {
  return (
    <PerformanceRacePanel
      className="h-full"
      hideHeader={false}
      autoPlay
    />
  );
}
