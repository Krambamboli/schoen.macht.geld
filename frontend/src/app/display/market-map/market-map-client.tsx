'use client';

import { MarketMapPanel } from '@/components/panels';

/**
 * Market Map display page - uses the MarketMapPanel component
 */
export default function MarketMapClient() {
  return (
    <MarketMapPanel
      className="h-full border-0"
      hideHeader
    />
  );
}
