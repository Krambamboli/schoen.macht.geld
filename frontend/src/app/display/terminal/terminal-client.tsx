'use client';

import { TerminalPanel } from '@/components/panels';

/**
 * Terminal display page - uses the TerminalPanel component with auto-scrolling
 */
export default function TerminalClient() {
  return (
    <TerminalPanel
      className="h-full"
      hideHeader={false}
      autoScroll
      showAutoScrollToggle
      showAbsoluteChange
    />
  );
}
