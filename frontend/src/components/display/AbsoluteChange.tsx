'use client';

import { cn } from '@/lib/utils';
import { FlashValue } from '@/components/flash-value';
import { formatChange, getChangeColorClass, TEXT_SIZES, type TextSize } from './utils';

interface AbsoluteChangeProps {
  /** The change value */
  value: number;
  /** Show +/- sign prefix */
  showSign?: boolean;
  /** Decimal places */
  decimals?: number;
  /** Text size */
  size?: TextSize;
  /** Show neutral color for zero */
  showNeutral?: boolean;
  /** Enable flash on value change */
  flash?: boolean;
  /** Tracking key for FlashValue */
  trackingKey?: string;
  /** Additional CSS classes */
  className?: string;
}

export function AbsoluteChange({
  value,
  showSign = true,
  decimals = 2,
  size = 'md',
  showNeutral = false,
  flash = false,
  trackingKey,
  className,
}: AbsoluteChangeProps) {
  const colorClass = getChangeColorClass(value, showNeutral);

  if (flash && trackingKey) {
    return (
      <span className={cn(TEXT_SIZES[size], colorClass, className)}>
        <FlashValue
          value={value}
          trackingKey={trackingKey}
          formatFn={(v) => formatChange(Number(v), showSign, decimals)}
        />
      </span>
    );
  }

  return (
    <span className={cn(TEXT_SIZES[size], colorClass, className)}>
      {formatChange(value, showSign, decimals)}
    </span>
  );
}
