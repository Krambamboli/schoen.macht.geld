'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FlashValueProps {
  /** The value to display and track for changes */
  value: number | string;
  /** Optional function to format the displayed value */
  formatFn?: (value: number | string) => string;
  /** Additional CSS classes */
  className?: string;
  /** Flash duration in milliseconds (default: 500ms) */
  flashDuration?: number;
  /** Unique key to track this specific value (e.g., stock ticker) */
  trackingKey?: string;
}

/**
 * A component that flashes yellow when its value changes.
 * Similar to Bloomberg terminal style value updates.
 */
export function FlashValue({
  value,
  formatFn,
  className,
  flashDuration = 500,
  trackingKey,
}: FlashValueProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevValueRef = useRef<number | string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip flash on initial mount
    if (prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }

    // Check if value actually changed
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Trigger flash
      setIsFlashing(true);

      // Remove flash after duration
      timeoutRef.current = setTimeout(() => {
        setIsFlashing(false);
      }, flashDuration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, flashDuration, trackingKey]);

  const displayValue = formatFn ? formatFn(value) : value;

  return (
    <span
      className={cn(
        'transition-colors duration-500',
        isFlashing && 'animate-flash',
        className
      )}
      style={{
        animationDuration: `${flashDuration}ms`,
      }}
    >
      {displayValue}
    </span>
  );
}
