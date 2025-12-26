import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface DisplayLabelProps {
  children: React.ReactNode;
  size?: TextSize;
  className?: string;
}

/**
 * Muted text label for column headers and field labels
 * Used for: "WERT", "CHG", "%", "KURS", "ÄNDERUNG", etc.
 */
export function DisplayLabel({
  children,
  size = 'xs',
  className,
}: DisplayLabelProps) {
  return (
    <span
      className={cn(
        TEXT_SIZES[size],
        'text-muted-foreground uppercase tracking-wider font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}
