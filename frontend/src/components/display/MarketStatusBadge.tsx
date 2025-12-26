import { COLORS } from './theme';
import { UI_MESSAGES } from '@/constants/messages';

interface MarketStatusBadgeProps {
  isOpen: boolean;
  className?: string;
}

/**
 * Market status indicator badge showing open/closed status
 */
export function MarketStatusBadge({ isOpen, className = '' }: MarketStatusBadgeProps) {
  const color = isOpen ? COLORS.positive : COLORS.negative;
  const label = isOpen ? UI_MESSAGES.marketOpen : UI_MESSAGES.marketClosed;

  return (
    <span className={className} style={{ color }}>
      ● {label}
    </span>
  );
}
