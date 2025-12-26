'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateStockGroupsAiGenerateStockGroupsGet } from '@/lib/api/client';
import type { StockGroup } from '@/lib/api/client';
import {
  DisplayLoading,
  DisplayEmpty,
  Panel,
  formatPrice,
  COLORS,
  SECTOR_COLORS,
  STOCK_COLORS,
} from '@/components/display';
import { TIMINGS } from '@/constants/timings';
import { LOADING_MESSAGES, EMPTY_STATE_MESSAGES, LABELS, ERROR_MESSAGES } from '@/constants/messages';

interface SectorSunburstPanelProps {
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Show legend */
  showLegend?: boolean;
}

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

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

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

function CustomSunburst({
  groups,
  width,
  height,
  compact = false,
}: {
  groups: StockGroup[];
  width: number;
  height: number;
  compact?: boolean;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 10;

  const innerRadius = maxRadius * 0.25;
  const sectorOuterRadius = maxRadius * 0.55;
  const stockOuterRadius = maxRadius * 0.95;
  const gap = compact ? 2 : 3;

  const totalValue = groups.reduce(
    (sum, g) => sum + g.stocks.reduce((s, stock) => s + Math.max(stock.price, 1), 0),
    0
  );

  const arcs: ArcData[] = [];
  let currentAngle = 0;

  groups.forEach((group, sectorIndex) => {
    const sectorValue = group.stocks.reduce((sum, s) => sum + Math.max(s.price, 1), 0);
    const sectorAngle = (sectorValue / totalValue) * 360;
    const sectorStartAngle = currentAngle;
    const sectorEndAngle = currentAngle + sectorAngle;

    arcs.push({
      startAngle: sectorStartAngle + gap / 2,
      endAngle: sectorEndAngle - gap / 2,
      innerRadius: innerRadius,
      outerRadius: sectorOuterRadius - gap,
      fill: SECTOR_COLORS[sectorIndex % SECTOR_COLORS.length],
      name: group.name,
      value: sectorValue,
    });

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
      {arcs.map((arc, i) => (
        <motion.path
          key={`arc-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02, duration: 0.3 }}
          d={describeArc(cx, cy, arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle)}
          fill={arc.fill}
          stroke="#000"
          strokeWidth={compact ? 1 : 2}
          className="cursor-pointer hover:brightness-110 transition-all"
        />
      ))}

      <circle cx={cx} cy={cy} r={innerRadius - gap} fill="#000" />

      {!compact && arcs.map((arc, i) => {
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const labelRadius = (arc.innerRadius + arc.outerRadius) / 2;
        const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);
        const arcAngle = arc.endAngle - arc.startAngle;

        const showLabel = arcAngle > 15;
        if (!showLabel) return null;

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
                border: `1px solid ${COLORS.primary}`,
                padding: '0 8px',
                color: COLORS.primary,
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
        y={cy - (compact ? 4 : 8)}
        textAnchor="middle"
        fill={COLORS.primary}
        fontSize={compact ? 16 : 24}
        fontWeight="bold"
        style={{ textShadow: `0 0 10px ${COLORS.primary}` }}
      >
        SMG
      </text>
      <text
        x={cx}
        y={cy + (compact ? 10 : 14)}
        textAnchor="middle"
        fill={COLORS.secondary}
        fontSize={compact ? 9 : 12}
        style={{ textTransform: 'uppercase' }}
      >
        BÖRSE
      </text>
    </svg>
  );
}

/**
 * Embeddable sector sunburst panel
 */
export function SectorSunburstPanel({
  compact = false,
  className,
  hideHeader = false,
  showRefresh = true,
  showLegend = true,
}: SectorSunburstPanelProps) {
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
      setError(ERROR_MESSAGES.generationFailed);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const interval = setInterval(() => fetchGroups(true), TIMINGS.sectorRefresh);
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
      <Panel title="SEKTOREN" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.sectorSunburst} />
      </Panel>
    );
  }

  if (error || groups.length === 0) {
    return (
      <Panel title="SEKTOREN" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayEmpty
          icon="◌"
          title={error || EMPTY_STATE_MESSAGES.noSectors.title}
          description={EMPTY_STATE_MESSAGES.noSectors.description}
          action={
            <button
              onClick={() => fetchGroups()}
              className="flex items-center gap-2 px-4 py-2 border border-primary bg-black text-primary hover:bg-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              {LABELS.retry}
            </button>
          }
        />
      </Panel>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <Panel
        title="SEKTOREN"
        info={`${stats.sectorCount} SEKTOREN`}
        className={className}
        hideHeader={hideHeader}
        compact
      >
        <div ref={containerRef} className="h-full flex items-center justify-center p-1">
          {chartSize > 50 && (
            <CustomSunburst groups={groups} width={chartSize - 10} height={chartSize - 10} compact />
          )}
        </div>
      </Panel>
    );
  }

  // Full mode
  return (
    <div className={cn('relative h-full bg-black text-primary overflow-hidden', className)}>
      {!hideHeader && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 border-b border-border bg-black/90 px-4 py-1">
          <span className="text-muted-foreground text-sm">
            {stats.sectorCount} SEKTOREN │ {stats.totalStocks} AKTIEN │ {formatPrice(stats.totalValue)} CHF
          </span>
          {showRefresh && (
            <button
              onClick={() => fetchGroups(true)}
              disabled={isRefreshing}
              className={cn(
                'flex items-center gap-2 px-2 py-0.5 border border-primary text-sm bg-black hover:bg-primary/20',
                isRefreshing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              {LABELS.refresh}
            </button>
          )}
        </div>
      )}

      <div ref={containerRef} className={cn('absolute left-0 right-0 flex items-center justify-center', hideHeader ? 'top-0 bottom-0' : 'top-10 bottom-10')}>
        {chartSize > 100 && (
          <CustomSunburst groups={groups} width={chartSize} height={chartSize} />
        )}
      </div>

      {showLegend && (
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
                  <span className="text-sm text-muted-foreground">{formatPrice(sectorTotal)} CHF</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
