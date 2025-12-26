'use client';

import { useState } from 'react';
import {
  TerminalPanel,
  LeaderboardPanel,
  MarketMapPanel,
  StockChartPanel,
  TopMoversPanel,
  MarketStatsPanel,
} from '@/components/panels';
import { MarketSummaryBar } from '@/components/display';

/**
 * Bloomberg Terminal-style composite view
 * Displays multiple panels in a dense, information-rich layout
 */
export default function BloombergClient() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <MarketSummaryBar title="SMG BLOOMBERG" />

      {/* Main grid layout */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-1 p-1 min-h-0">
        {/* Left column - Terminal (rows 1-4) */}
        <TerminalPanel
          limit={15}
          compact
          className="col-span-3 row-span-4"
        />

        {/* Center top - Market Map (rows 1-3) */}
        <MarketMapPanel
          compact
          className="col-span-6 row-span-3"
        />

        {/* Right column - Leaderboard (rows 1-3) */}
        <LeaderboardPanel
          limit={10}
          compact
          className="col-span-3 row-span-3"
        />

        {/* Center middle - Stock Chart (rows 4-6) */}
        <StockChartPanel
          ticker={selectedTicker ?? undefined}
          compact
          className="col-span-6 row-span-3"
          autoRotate={!selectedTicker}
          rotationInterval={8000}
        />

        {/* Right bottom - Top Movers (rows 4-6) */}
        <TopMoversPanel
          limit={5}
          compact
          className="col-span-3 row-span-3"
          selectedTicker={selectedTicker}
          onStockSelect={setSelectedTicker}
        />

        {/* Bottom left - Quick Stats (rows 5-6) */}
        <MarketStatsPanel
          compact
          className="col-span-3 row-span-2"
        />
      </div>
    </div>
  );
}
