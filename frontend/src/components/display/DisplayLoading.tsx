'use client';

import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface DisplayLoadingProps {
  /** Loading message */
  message?: string;
  /** Text size */
  size?: TextSize;
  /** Additional CSS classes */
  className?: string;
}

export function DisplayLoading({
  message = 'LADE DATEN',
  size = '2xl',
  className,
}: DisplayLoadingProps) {
  return (
    <div className={cn('h-full flex items-center justify-center bg-black text-primary', className)}>
      <span className={cn('blink-cursor', TEXT_SIZES[size])}>
        {message}
      </span>
    </div>
  );
}
