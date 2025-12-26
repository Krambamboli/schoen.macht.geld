import { cn } from '@/lib/utils';
import { TEXT_SIZES, type TextSize } from './utils';

interface DisplayEmptyProps {
  /** Icon or symbol to display (e.g., "IPO", "◌", emoji) */
  icon?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button */
  action?: React.ReactNode;
  /** Icon size */
  iconSize?: TextSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state component for when no data is available
 */
export function DisplayEmpty({
  icon,
  title,
  description,
  action,
  iconSize = '3xl',
  className,
}: DisplayEmptyProps) {
  return (
    <div className={cn(
      'flex items-center justify-center h-full bg-black text-primary',
      className
    )}>
      <div className="border-2 border-primary p-8 text-center">
        {icon && (
          <div className={cn(TEXT_SIZES[iconSize], 'mb-4 led-glow')}>
            {icon}
          </div>
        )}
        <h2 className="text-2xl font-bold uppercase">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-2 uppercase">{description}</p>
        )}
        {action && (
          <div className="mt-4">{action}</div>
        )}
      </div>
    </div>
  );
}
