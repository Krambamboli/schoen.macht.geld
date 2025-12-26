import { cn } from '@/lib/utils';
import { StockCount } from './StockCount';

interface DisplayHeaderProps {
  /** Number of stocks to display in count */
  stockCount?: number;
  /** Content to display on the left side */
  left?: React.ReactNode;
  /** Content to display on the right side (after stock count) */
  right?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use transparent/overlay background */
  overlay?: boolean;
}

/**
 * Consistent header bar for display pages
 */
export function DisplayHeader({
  stockCount,
  left,
  right,
  className,
  overlay = false,
}: DisplayHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-1 border-b border-border',
        overlay ? 'bg-black/90' : 'bg-black',
        className
      )}
    >
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {left}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {stockCount !== undefined && <StockCount count={stockCount} />}
        {right}
      </div>
    </div>
  );
}
