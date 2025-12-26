'use client';

import { IpoSpotlightPanel } from '@/components/panels';

/**
 * IPO Spotlight display page - uses the IpoSpotlightPanel component
 */
export default function IpoSpotlightClient() {
  return (
    <IpoSpotlightPanel
      className="h-full"
      hideHeader={false}
      autoPlay
      showControls
      showSidebar
    />
  );
}
