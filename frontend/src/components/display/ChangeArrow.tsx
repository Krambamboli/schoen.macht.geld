'use client';

import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { getChangeColorClass, getArrowSymbol } from './utils';
import { ICON_SIZES, SYMBOL_SIZES } from './theme';

interface ChangeArrowProps {
  /** Value determining direction (positive = up, negative = down, 0 = neutral) */
  value: number;
  /** Display variant: 'symbol' for ▲/▼, 'icon' for lucide icons */
  variant?: 'symbol' | 'icon';
  /** Icon/symbol size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show neutral indicator (─) for zero */
  showNeutral?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ChangeArrow({
  value,
  variant = 'symbol',
  size = 'md',
  showNeutral = true,
  className,
}: ChangeArrowProps) {
  const colorClass = getChangeColorClass(value, showNeutral);

  if (variant === 'icon') {
    if (value > 0) {
      return <ArrowUp className={cn(ICON_SIZES[size], 'text-green-500', className)} />;
    }
    if (value < 0) {
      return <ArrowDown className={cn(ICON_SIZES[size], 'text-red-500', className)} />;
    }
    if (showNeutral) {
      return <span className={cn(SYMBOL_SIZES[size], 'text-muted-foreground', className)}>─</span>;
    }
    return null;
  }

  const symbol = getArrowSymbol(value, showNeutral);
  if (!symbol) return null;

  return (
    <span className={cn(SYMBOL_SIZES[size], colorClass, className)}>
      {symbol}
    </span>
  );
}
