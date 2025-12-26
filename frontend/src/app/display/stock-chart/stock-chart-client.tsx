'use client';

import { StockChartPanel } from '@/components/panels';

/**
 * Stock Chart display page - uses the StockChartPanel component
 */
export default function StockChartClient() {
  return (
    <StockChartPanel
      className="h-full border-0"
      hideHeader
      autoRotate
    />
  );
}
