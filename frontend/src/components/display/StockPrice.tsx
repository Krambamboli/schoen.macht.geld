'use client';

import { cn } from '@/lib/utils';
import { FlashValue } from '@/components/flash-value';
import { formatPrice, getChangeColorClass, TEXT_SIZES, type TextSize } from './utils';

interface StockPriceProps {
  /** The price value to display */
  value: number;
  /** Change value for color coding (positive = green, negative = red) */
  change?: number;
  /** Show currency suffix */
  showCurrency?: boolean;
  /** Currency label */
  currency?: string;
  /** Decimal places */
  decimals?: number;
  /** Text size */
  size?: TextSize;
  /** Enable LED glow effect */
  glow?: boolean;
  /** Enable flash on value change */
  flash?: boolean;
  /** Tracking key for FlashValue */
  trackingKey?: string;
  /** Additional CSS classes */
  className?: string;
}

export function StockPrice({
  value,
  change,
  showCurrency = false,
  currency = 'CHF',
  decimals = 2,
  size = 'md',
  glow = false,
  flash = false,
  trackingKey,
  className,
}: StockPriceProps) {
  const colorClass = change !== undefined ? getChangeColorClass(change) : '';

  const content = (
    <>
      <span className={cn(glow && 'led-glow')}>
        {formatPrice(value, decimals)}
      </span>
      {showCurrency && (
        <span className="text-muted-foreground ml-1">{currency}</span>
      )}
    </>
  );

  if (flash && trackingKey) {
    return (
      <span data-price className={cn('font-bold', TEXT_SIZES[size], colorClass, className)}>
        <FlashValue
          value={value}
          trackingKey={trackingKey}
          formatFn={(v) => formatPrice(Number(v), decimals)}
          className={cn(glow && 'led-glow')}
        />
        {showCurrency && (
          <span className="text-muted-foreground ml-1">{currency}</span>
        )}
      </span>
    );
  }

  return (
    <span data-price className={cn('font-bold', TEXT_SIZES[size], colorClass, className)}>
      {content}
    </span>
  );
}
