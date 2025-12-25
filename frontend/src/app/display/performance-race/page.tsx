import PerformanceRaceClient from './performance-race-client';

/**
 * Performance Race display page.
 * Shows an animated line race of top 5 stocks over time.
 */
export default function PerformanceRacePage() {
  return (
    <div className="w-full h-full bg-black font-sans">
      <PerformanceRaceClient />
    </div>
  );
}