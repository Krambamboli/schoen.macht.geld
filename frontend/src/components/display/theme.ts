// Display theme constants - centralized colors and chart configuration

// Brand colors
export const COLORS = {
  primary: '#ff9900',
  secondary: '#ffcc00',
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#374151',

  // Background variants for sentiment
  positiveBg: '#166534',
  negativeBg: '#991b1b',

  // Position medal colors
  gold: '#ffcc00',
  silver: '#9ca3af',
  bronze: '#b45309',

  // Chart grid
  gridLine: 'rgba(255, 153, 0, 0.2)',
} as const;

// Sector color palette for visualizations
export const SECTOR_COLORS = [
  '#ff9900',
  '#ffcc00',
  '#22c55e',
  '#3b82f6',
  '#f97316',
  '#a855f7',
] as const;

// Stock color shades per sector (6 sectors × 4 shades)
export const STOCK_COLORS = [
  ['#d97706', '#b45309', '#92400e', '#78350f'], // Browns
  ['#ca8a04', '#a16207', '#854d0e', '#713f12'], // Ambers
  ['#16a34a', '#15803d', '#166534', '#14532d'], // Greens
  ['#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'], // Blues
  ['#ea580c', '#c2410c', '#9a3412', '#7c2d12'], // Oranges
  ['#9333ea', '#7e22ce', '#6b21a8', '#581c87'], // Purples
] as const;

// Recharts configuration - spreadable props
export const CHART_THEME = {
  axis: {
    tick: { fill: '#ff9900', fontSize: 12 },
    tickLine: { stroke: '#ff9900' },
    axisLine: { stroke: '#ff9900', strokeWidth: 2 },
  },
  grid: {
    strokeDasharray: '1 1',
    stroke: 'rgba(255, 153, 0, 0.2)',
  },
  tooltip: {
    contentStyle: {
      backgroundColor: '#000',
      border: '2px solid #ff9900',
      borderRadius: 0,
      color: '#ff9900',
      fontFamily: 'var(--font-body), monospace',
    },
    cursor: { stroke: '#ff9900' },
  },
} as const;

// Icon size mappings (for lucide icons and similar)
export const ICON_SIZES = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
} as const;

// Symbol text size mappings (for text-based icons like arrows)
export const SYMBOL_SIZES = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

// Helper to get sentiment color (hex value)
export function getSentimentColor(value: number): string {
  if (value > 0) return COLORS.positive;
  if (value < 0) return COLORS.negative;
  return COLORS.neutral;
}

// Helper to get sentiment background color (hex value)
export function getSentimentBgColor(value: number): string {
  if (value > 0) return COLORS.positiveBg;
  if (value < 0) return COLORS.negativeBg;
  return COLORS.neutral;
}

// Helper to get all sentiment-related styles at once
export interface SentimentStyles {
  color: string;
  bgColor: string;
  glowColor: string;
}

export function getSentimentStyles(value: number): SentimentStyles {
  const color = getSentimentColor(value);
  const bgColor = getSentimentBgColor(value);
  const glowColor = value !== 0 ? `0 0 4px ${color}` : 'none';

  return { color, bgColor, glowColor };
}

// Alternating row background utility
export function getAlternatingRowClass(index: number): string {
  return index % 2 === 0 ? 'bg-transparent' : 'bg-primary/5';
}
