'use client';

import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface TickerSymbolProps {
  /** The ticker symbol */
  ticker: string;
  /** Text size */
  size?: TextSize;
  /** Color variant */
  variant?: 'default' | 'accent' | 'primary';
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CLASSES = {
  default: 'text-foreground',
  accent: 'text-accent',
  primary: 'text-primary',
} as const;

export function TickerSymbol({
  ticker,
  size = 'md',
  variant = 'accent',
  className,
}: TickerSymbolProps) {
  return (
    <span
      className={cn(
        'font-bold uppercase tracking-wide',
        TEXT_SIZES[size],
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {ticker}
    </span>
  );
}
