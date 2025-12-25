'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateStockGroupsAiGenerateStockGroupsGet } from '@/lib/api/client';
import type { StockGroup } from '@/lib/api/client';


const REFRESH_INTERVAL_MS = 90000;

// Bloomberg terminal color palette for sectors
const SECTOR_COLORS = [
  '#ff9900', // Primary orange
  '#ffcc00', // Gold/accent
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f97316', // Orange variant
  '#a855f7', // Purple
];

// Darker shades for stocks - terminal aesthetic
const STOCK_COLORS = [
  ['#d97706', '#b45309', '#92400e', '#78350f'],
  ['#ca8a04', '#a16207', '#854d0e', '#713f12'],
  ['#16a34a', '#15803d', '#166534', '#14532d'],
  ['#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  ['#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  ['#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
];

interface ArcData {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  fill: string;
  name: string;
  value: number;
  isStock?: boolean;
}

// Convert polar to cartesian coordinates
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// Generate SVG arc path
function describeArc(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const start1 = polarToCartesian(cx, cy, outerRadius, endAngle);
  const end1 = polarToCartesian(cx, cy, outerRadius, startAngle);
  const start2 = polarToCartesian(cx, cy, innerRadius, startAngle);
  const end2 = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M', start1.x, start1.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end1.x, end1.y,
    'L', start2.x, start2.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, end2.x, end2.y,
    'Z',
  ].join(' ');
}

// Custom Sunburst Component
function CustomSunburst({
  groups,
  width,
  height,
}: {
  groups: StockGroup[];
  width: number;
  height: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 10;

  // Ring dimensions
  const innerRadius = maxRadius * 0.25;
  const sectorOuterRadius = maxRadius * 0.55;
  const stockOuterRadius = maxRadius * 0.95;
  const gap = 3;

  // Calculate total value
  const totalValue = groups.reduce(
    (sum, g) => sum + g.stocks.reduce((s, stock) => s + Math.max(stock.price, 1), 0),
    0
  );

  // Build arc data
  const arcs: ArcData[] = [];
  let currentAngle = 0;

  groups.forEach((group, sectorIndex) => {
    const sectorValue = group.stocks.reduce((sum, s) => sum + Math.max(s.price, 1), 0);
    const sectorAngle = (sectorValue / totalValue) * 360;
    const sectorStartAngle = currentAngle;
    const sectorEndAngle = currentAngle + sectorAngle;

    // Add sector arc
    arcs.push({
      startAngle: sectorStartAngle + gap / 2,
      endAngle: sectorEndAngle - gap / 2,
      innerRadius: innerRadius,
      outerRadius: sectorOuterRadius - gap,
      fill: SECTOR_COLORS[sectorIndex % SECTOR_COLORS.length],
      name: group.name,
      value: sectorValue,
    });

    // Add stock arcs within this sector
    let stockAngle = sectorStartAngle;
    group.stocks.forEach((stock, stockIndex) => {
      const stockValue = Math.max(stock.price, 1);
      const stockArcAngle = (stockValue / sectorValue) * sectorAngle;
      const stockStartAngle = stockAngle;
      const stockEndAngle = stockAngle + stockArcAngle;

      arcs.push({
        startAngle: stockStartAngle + gap / 2,
        endAngle: stockEndAngle - gap / 2,
        innerRadius: sectorOuterRadius + gap,
        outerRadius: stockOuterRadius,
        fill: STOCK_COLORS[sectorIndex % STOCK_COLORS.length][stockIndex % 4],
        name: stock.title,
        value: stock.price,
        isStock: true,
      });

      stockAngle = stockEndAngle;
    });

    currentAngle = sectorEndAngle;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Arcs */}
      {arcs.map((arc, i) => (
        <motion.path
          key={`arc-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02, duration: 0.3 }}
          d={describeArc(cx, cy, arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle)}
          fill={arc.fill}
          stroke="#000"
          strokeWidth={2}
          className="cursor-pointer hover:brightness-110 transition-all"
        />
      ))}

      {/* Center - drawn before labels so it doesn't cover them */}
      <circle cx={cx} cy={cy} r={innerRadius - gap} fill="#000" />

      {/* Labels with boxes - terminal style */}
      {arcs.map((arc, i) => {
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const labelRadius = (arc.innerRadius + arc.outerRadius) / 2;
        const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);
        const arcAngle = arc.endAngle - arc.startAngle;

        // Only show label if arc is big enough
        const showLabel = arcAngle > 15;
        if (!showLabel) return null;

        // Estimate box size based on text length
        const charWidth = arc.isStock ? 7 : 8;
        const boxWidth = Math.max(arc.isStock ? 60 : 80, arc.name.length * charWidth + 20);
        const boxHeight = arc.isStock ? 24 : 28;

        return (
          <foreignObject
            key={`label-${i}`}
            x={labelPos.x - boxWidth / 2}
            y={labelPos.y - boxHeight / 2}
            width={boxWidth}
            height={boxHeight}
            className="pointer-events-none"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                border: '1px solid #ff9900',
                padding: '0 8px',
                color: '#ff9900',
                fontSize: arc.isStock ? '11px' : '13px',
                fontWeight: arc.isStock ? 'normal' : 'bold',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-body), monospace',
              }}
            >
              {arc.name}
            </div>
          </foreignObject>
        );
      })}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#ff9900"
        fontSize={24}
        fontWeight="bold"
        style={{ textShadow: '0 0 10px #ff9900' }}
      >
        SMG
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="#ffcc00"
        fontSize={12}
        style={{ textTransform: 'uppercase' }}
      >
        BÖRSE
      </text>
    </svg>
  );
}

export default function SectorSunburstClient() {
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    const timeout = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isLoading]);

  const fetchGroups = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await generateStockGroupsAiGenerateStockGroupsGet();
      if (response.data?.groups) {
        setGroups(response.data.groups);
      }
    } catch (err) {
      console.error('Failed to fetch stock groups:', err);
      setError('Generierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch - only once
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchGroups();
  }, [fetchGroups]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => fetchGroups(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchGroups]);

  const stats = useMemo(() => {
    const totalStocks = groups.reduce((sum, g) => sum + g.stocks.length, 0);
    const allStocks = groups.flatMap((g) => g.stocks);
    const totalValue = allStocks.reduce((sum, s) => sum + s.price, 0);
    return { totalStocks, totalValue, sectorCount: groups.length };
  }, [groups]);

  const chartSize = Math.min(dimensions.width, dimensions.height);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-primary">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl mb-4"
        >
          ◐
        </motion.div>
        <span className="text-xl blink-cursor">PRAKTIKANT SORTIERT AKTIEN...</span>
      </div>
    );
  }

  if (error || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-primary">
        <div className="border-2 border-primary p-8 text-center">
          <div className="text-4xl mb-4">◌</div>
          <h2 className="text-xl font-bold mb-2">{error || 'KEINE SEKTOREN VERFÜGBAR'}</h2>
          <p className="text-muted-foreground mb-4">NICHT GENUG AKTIEN FÜR GRUPPIERUNG</p>
          <button
            onClick={() => fetchGroups()}
            className="flex items-center gap-2 px-4 py-2 border border-primary bg-black text-primary hover:bg-primary/20"
          >
            <RefreshCw className="w-4 h-4" />
            ERNEUT VERSUCHEN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black text-primary overflow-hidden">
      {/* Controls bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 border-b border-border bg-black/90 px-4 py-1">
        <span className="text-muted-foreground text-sm">
          {stats.sectorCount} SEKTOREN │ {stats.totalStocks} AKTIEN │ {stats.totalValue.toFixed(2)} CHF
        </span>
        <button
          onClick={() => fetchGroups(true)}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 px-2 py-0.5 border border-primary text-sm bg-black hover:bg-primary/20',
            isRefreshing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          NEU
        </button>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="absolute top-10 bottom-10 left-0 right-0 flex items-center justify-center">
        {chartSize > 100 && (
          <CustomSunburst groups={groups} width={chartSize} height={chartSize} />
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-border bg-black/90 px-4 py-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
          {groups.map((group, index) => {
            const sectorTotal = group.stocks.reduce((sum, s) => sum + s.price, 0);
            return (
              <div key={group.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
                />
                <span className="text-sm font-bold truncate max-w-[200px] uppercase">{group.name}</span>
                <span className="text-sm text-muted-foreground">{sectorTotal.toFixed(2)} CHF</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
