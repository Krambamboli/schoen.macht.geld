'use client';

import { FlashValue } from '@/components/flash-value';

interface FlashWrapperProps {
  /** The value to display and track */
  value: number;
  /** Enable flash effect on value change */
  flash?: boolean;
  /** Tracking key for flash (required if flash is true) */
  trackingKey?: string;
  /** Format function for the value */
  formatFn: (value: number) => string;
  /** Children to render when not flashing (receives formatted value) */
  children: (formattedValue: string) => React.ReactNode;
}

/**
 * Wrapper that handles flash animation logic
 * Reduces duplication across StockPrice, PercentChange, AbsoluteChange, RankBadge
 */
export function FlashWrapper({
  value,
  flash = false,
  trackingKey,
  formatFn,
  children,
}: FlashWrapperProps) {
  if (flash && trackingKey) {
    return (
      <FlashValue
        value={value}
        trackingKey={trackingKey}
        formatFn={(v) => formatFn(Number(v))}
      />
    );
  }

  return <>{children(formatFn(value))}</>;
}
