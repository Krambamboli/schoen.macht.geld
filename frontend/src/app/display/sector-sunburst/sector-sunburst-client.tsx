'use client';

import { SectorSunburstPanel } from '@/components/panels';

/**
 * Sector Sunburst display page - uses the SectorSunburstPanel component
 */
export default function SectorSunburstClient() {
  return (
    <SectorSunburstPanel
      className="h-full"
      hideHeader={false}
      showRefresh
      showLegend
    />
  );
}
