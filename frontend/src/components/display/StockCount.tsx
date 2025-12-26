'use client';

import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface StockCountProps {
  /** Number of stocks */
  count: number;
  /** Label text */
  label?: string;
  /** Text size */
  size?: TextSize;
  /** Additional CSS classes */
  className?: string;
}

export function StockCount({
  count,
  label = 'TITEL',
  size = 'sm',
  className,
}: StockCountProps) {
  return (
    <span className={cn('text-muted-foreground', TEXT_SIZES[size], className)}>
      {count} {label}
    </span>
  );
}
