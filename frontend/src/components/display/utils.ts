/**
 * Shared utilities for display components
 *
 * Note: Color utilities here return Tailwind classes.
 * For hex values, use getSentimentColor() from theme.ts
 * The colors are aligned: text-green-500 = COLORS.positive (#22c55e)
 *                        text-red-500 = COLORS.negative (#ef4444)
 */

// Tailwind class color utilities (for className prop)
// Use these for React component styling
export const getChangeColor = (value: number): string =>
  value >= 0 ? 'text-green-500' : 'text-red-500';

export const getChangeColorClass = (value: number, showNeutral = false): string => {
  if (showNeutral && value === 0) return 'text-muted-foreground';
  return value >= 0 ? 'text-green-500' : 'text-red-500';
};

// Formatting utilities
export const formatPrice = (value: number, decimals = 2): string =>
  value.toFixed(decimals);

export const formatPercent = (value: number, showSign = true, decimals = 1): string => {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatChange = (value: number, showSign = true, decimals = 2): string => {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
};

// Arrow utilities
export const getArrowSymbol = (value: number, showNeutral = true): string => {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return showNeutral ? '─' : '';
};

// Size mappings
export const TEXT_SIZES = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
} as const;

export type TextSize = keyof typeof TEXT_SIZES;
