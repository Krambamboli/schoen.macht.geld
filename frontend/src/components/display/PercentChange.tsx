'use client';

import { cn } from '@/lib/utils';
import { FlashValue } from '@/components/flash-value';
import { formatPercent, getChangeColorClass, getArrowSymbol, TEXT_SIZES, type TextSize } from './utils';

interface PercentChangeProps {
  /** The percentage value */
  value: number;
  /** Show +/- sign prefix */
  showSign?: boolean;
  /** Show arrow indicator (▲/▼) */
  showArrow?: boolean;
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

export function PercentChange({
  value,
  showSign = true,
  showArrow = false,
  decimals = 1,
  size = 'md',
  showNeutral = false,
  flash = false,
  trackingKey,
  className,
}: PercentChangeProps) {
  const colorClass = getChangeColorClass(value, showNeutral);
  const arrow = showArrow && value !== 0 ? getArrowSymbol(value, false) : '';

  if (flash && trackingKey) {
    return (
      <span data-percent-change className={cn('font-bold', TEXT_SIZES[size], colorClass, className)}>
        {arrow && <span className="mr-1">{arrow}</span>}
        <FlashValue
          value={value}
          trackingKey={trackingKey}
          formatFn={(v) => formatPercent(Number(v), showSign, decimals)}
        />
      </span>
    );
  }

  return (
    <span data-percent-change className={cn('font-bold', TEXT_SIZES[size], colorClass, className)}>
      {arrow && <span className="mr-1">{arrow}</span>}
      {formatPercent(value, showSign, decimals)}
    </span>
  );
}
