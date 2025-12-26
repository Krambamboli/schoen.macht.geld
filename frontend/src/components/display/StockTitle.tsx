'use client';

import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface StockTitleProps {
  /** The company/stock title */
  title: string;
  /** Text size */
  size?: TextSize;
  /** Enable text truncation */
  truncate?: boolean;
  /** Max width class (e.g., 'max-w-xs') */
  maxWidth?: string;
  /** Additional CSS classes */
  className?: string;
}

export function StockTitle({
  title,
  size = 'md',
  truncate = true,
  maxWidth = 'max-w-xs',
  className,
}: StockTitleProps) {
  return (
    <span
      className={cn(
        'text-foreground',
        TEXT_SIZES[size],
        truncate && 'truncate',
        truncate && maxWidth,
        className
      )}
    >
      {title}
    </span>
  );
}
