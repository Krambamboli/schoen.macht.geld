import Image from 'next/image';
import { cn } from '@/lib/utils';

interface StockImageProps {
  /** Image URL */
  src?: string | null;
  /** Alt text for image */
  alt: string;
  /** Ticker symbol for fallback display */
  ticker: string;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to add glow effect */
  glow?: boolean;
  /** Use rounded shape instead of square */
  rounded?: boolean;
  /** Custom border color (CSS color value) */
  borderColor?: string;
  /** Custom fallback background (CSS class or color) */
  fallbackBg?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
  xl: 'w-40 h-40',
} as const;

const FALLBACK_TEXT_SIZES = {
  sm: 'text-xs',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
} as const;

/**
 * Stock image with fallback to ticker initials
 */
export function StockImage({
  src,
  alt,
  ticker,
  size = 'md',
  className,
  glow = false,
  rounded = false,
  borderColor,
  fallbackBg,
}: StockImageProps) {
  const sizeClass = SIZE_CLASSES[size];
  const fallbackTextSize = FALLBACK_TEXT_SIZES[size];

  const borderStyle = borderColor ? { borderColor } : undefined;
  const glowStyle = glow ? { boxShadow: '0 0 20px rgba(255, 153, 0, 0.3)' } : undefined;

  return (
    <div
      className={cn(
        'relative overflow-hidden border-2 border-primary',
        sizeClass,
        rounded ? 'rounded-full' : '',
        className
      )}
      style={{ ...borderStyle, ...glowStyle }}
    >
      {src ? (
        <Image
          unoptimized
          src={src}
          alt={alt}
          fill
          className="object-cover"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center font-bold text-primary',
            fallbackBg || 'bg-primary/20',
            fallbackTextSize
          )}
        >
          {ticker.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
