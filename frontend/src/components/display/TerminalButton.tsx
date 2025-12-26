import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button is in active state */
  active?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
} as const;

/**
 * Terminal-style button with consistent styling
 */
export const TerminalButton = forwardRef<HTMLButtonElement, TerminalButtonProps>(
  ({ size = 'md', active = false, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center gap-1.5 border font-bold transition-colors',
          'border-primary bg-black text-primary',
          'hover:bg-primary/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          active && 'bg-primary text-primary-foreground hover:bg-primary/90',
          SIZE_CLASSES[size],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);

TerminalButton.displayName = 'TerminalButton';
