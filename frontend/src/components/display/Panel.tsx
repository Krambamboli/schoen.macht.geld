import { cn } from '@/lib/utils';

interface PanelProps {
  /** Panel title displayed in the title bar */
  title: string;
  /** Additional info displayed on the right side of title bar */
  info?: React.ReactNode;
  /** Panel content */
  children: React.ReactNode;
  /** Additional CSS classes for the outer container */
  className?: string;
  /** Whether to hide the title bar */
  hideHeader?: boolean;
  /** Compact mode with smaller padding */
  compact?: boolean;
}

/**
 * Reusable panel wrapper with Bloomberg-style title bar
 * Used to embed display views in composite layouts
 */
export function Panel({
  title,
  info,
  children,
  className,
  hideHeader = false,
  compact = false,
}: PanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-black border border-border overflow-hidden',
        className
      )}
    >
      {!hideHeader && (
        <div
          className={cn(
            'flex items-center justify-between border-b border-border bg-primary/10 shrink-0',
            compact ? 'px-2 py-0.5' : 'px-3 py-1'
          )}
        >
          <span
            className={cn(
              'font-bold text-primary uppercase tracking-wide',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            ┌─ {title} ─┐
          </span>
          {info && (
            <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
              {info}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">{children}</div>
    </div>
  );
}
