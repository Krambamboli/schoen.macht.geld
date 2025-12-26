'use client';

import { cn } from '@/lib/utils';

interface StatBoxProps {
  /** Label displayed above the content */
  label: string;
  /** Content to display */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Bordered stat box with label and content
 * Used in market statistics panels
 */
export function StatBox({ label, children, className }: StatBoxProps) {
  return (
    <div className={cn('border border-border p-1.5', className)}>
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
