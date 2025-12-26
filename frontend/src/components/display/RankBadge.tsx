'use client';

import { cn } from '@/lib/utils';
import { FlashValue } from '@/components/flash-value';
import { ChangeArrow } from './ChangeArrow';
import { TEXT_SIZES, type TextSize } from './utils';

interface RankBadgeProps {
  /** The rank position */
  rank: number | null | undefined;
  /** Rank change value (positive = improved, negative = declined) */
  rankChange?: number;
  /** Highlight with LED glow (e.g., for top 3) */
  highlight?: boolean;
  /** Text size */
  size?: TextSize;
  /** Arrow variant */
  arrowVariant?: 'symbol' | 'icon';
  /** Enable flash on value change */
  flash?: boolean;
  /** Tracking key for FlashValue */
  trackingKey?: string;
  /** Additional CSS classes */
  className?: string;
}

export function RankBadge({
  rank,
  rankChange = 0,
  highlight = false,
  size = 'lg',
  arrowVariant = 'icon',
  flash = false,
  trackingKey,
  className,
}: RankBadgeProps) {
  const displayRank = rank ?? '-';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span
        className={cn(
          'font-bold',
          TEXT_SIZES[size],
          highlight ? 'text-accent led-glow' : 'text-primary'
        )}
      >
        {flash && trackingKey ? (
          <FlashValue value={displayRank} trackingKey={trackingKey} />
        ) : (
          displayRank
        )}
      </span>
      {rank != null && (
        <ChangeArrow
          value={rankChange}
          variant={arrowVariant}
          size={size === 'lg' || size === 'xl' ? 'md' : 'sm'}
          showNeutral
        />
      )}
    </div>
  );
}
