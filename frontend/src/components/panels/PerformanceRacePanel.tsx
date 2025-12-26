'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Trophy, Play, RotateCcw } from 'lucide-react';
import { useRaceData, type RaceStock } from '@/hooks/use-stocks';
import {
  DisplayLoading,
  DisplayEmpty,
  Panel,
  formatPrice,
  COLORS,
  CHART_THEME,
} from '@/components/display';
import { TIMINGS } from '@/constants/timings';
import { LOADING_MESSAGES, EMPTY_STATE_MESSAGES } from '@/constants/messages';

interface PerformanceRacePanelProps {
  /** Number of stocks to race */
  stockCount?: number;
  /** Number of data points */
  dataPoints?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Whether to auto-play on load */
  autoPlay?: boolean;
}

interface RaceStockWithValue extends RaceStock {
  raceValue: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Embeddable performance race panel showing animated stock price race
 */
export function PerformanceRacePanel({
  stockCount = 5,
  dataPoints = 30,
  compact = false,
  className,
  hideHeader = false,
  autoPlay = true,
}: PerformanceRacePanelProps) {
  const { raceStocks, raceData, isLoading } = useRaceData(stockCount, dataPoints);

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const totalFrames = raceData.length;
  const isComplete = progress >= totalFrames - 1;
  const currentFrame = Math.floor(progress);

  const frameDurationMs = useMemo(() => {
    if (totalFrames <= 1) return 1000;
    return (TIMINGS.raceSyncInterval - TIMINGS.raceEndBuffer) / (totalFrames - 1);
  }, [totalFrames]);

  const stockTickersKey = useMemo(() => {
    return raceStocks.map((s) => s.ticker).sort().join(',');
  }, [raceStocks]);

  const prevStockTickersRef = useRef<string>('');

  useEffect(() => {
    if (stockTickersKey && stockTickersKey !== prevStockTickersRef.current) {
      prevStockTickersRef.current = stockTickersKey;
      setProgress(0);
      setIsPlaying(autoPlay);
    }
  }, [stockTickersKey, autoPlay]);

  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const progressIncrement = deltaTime / frameDurationMs;

      setProgress((prev) => {
        const next = prev + progressIncrement;
        if (next >= totalFrames - 1) {
          setIsPlaying(false);
          return totalFrames - 1;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, totalFrames, frameDurationMs]);

  const getInterpolatedValue = useCallback(
    (ticker: string): number | null => {
      if (raceData.length === 0) return null;

      const frame = Math.floor(progress);
      const t = easeInOutCubic(progress - frame);

      const currentValue = raceData[frame]?.[ticker] as number | undefined;
      const nextValue = raceData[frame + 1]?.[ticker] as number | undefined;

      if (currentValue === undefined) return null;
      if (nextValue === undefined || frame >= totalFrames - 1) return currentValue;

      return lerp(currentValue, nextValue, t);
    },
    [raceData, progress, totalFrames]
  );

  const chartData = useMemo(() => {
    return raceData.map((point, index) => {
      if (index <= currentFrame) {
        return point;
      }
      const emptyPoint: Record<string, string | null> = { timestamp: point.timestamp };
      raceStocks.forEach((stock) => {
        emptyPoint[stock.ticker] = null;
      });
      return emptyPoint;
    });
  }, [raceData, currentFrame, raceStocks]);

  const sortedStocks = useMemo((): RaceStockWithValue[] => {
    if (raceData.length === 0 || raceStocks.length === 0) {
      return raceStocks.map((s) => ({ ...s, raceValue: s.currentPrice }));
    }

    return [...raceStocks]
      .map((stock) => ({
        ...stock,
        raceValue: getInterpolatedValue(stock.ticker) ?? stock.currentPrice,
      }))
      .sort((a, b) => b.raceValue - a.raceValue);
  }, [raceStocks, raceData, getInterpolatedValue]);

  const currentTimestamp = raceData[currentFrame]?.timestamp ?? '';

  const handleRestart = useCallback(() => {
    setProgress(0);
    setIsPlaying(true);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isComplete) {
      handleRestart();
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [isComplete, handleRestart]);

  if (isLoading) {
    return (
      <Panel title="RENNEN" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.performanceRace} />
      </Panel>
    );
  }

  if (raceStocks.length === 0) {
    return (
      <Panel title="RENNEN" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayEmpty icon="🏁" title={EMPTY_STATE_MESSAGES.noStocks.title} />
      </Panel>
    );
  }

  if (raceData.length === 0) {
    return (
      <Panel title="RENNEN" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayEmpty icon="📊" title={EMPTY_STATE_MESSAGES.noPriceData.title} />
      </Panel>
    );
  }

  // Compact mode - simpler layout
  if (compact) {
    return (
      <Panel
        title="RENNEN"
        info={`${currentFrame + 1}/${totalFrames}`}
        className={className}
        hideHeader={hideHeader}
        compact
      >
        <div className="h-full flex flex-col p-1">
          <div className="h-1 bg-border mb-1 overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${((progress + 1) / totalFrames) * 100}%` }}
            />
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray={CHART_THEME.grid.strokeDasharray}
                  stroke={CHART_THEME.grid.stroke}
                />
                {raceStocks.map((stock) => (
                  <Line
                    key={stock.ticker}
                    type="monotone"
                    dataKey={stock.ticker}
                    stroke={stock.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>
    );
  }

  // Full mode
  return (
    <div className={cn('h-full flex flex-col bg-black text-primary', className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <Trophy className="w-5 h-5 text-accent" />
            <span>{currentTimestamp} │ FRAME {currentFrame + 1}/{totalFrames}</span>
          </div>
          <button
            onClick={handleTogglePlay}
            className="p-1.5 border border-primary bg-black hover:bg-primary/20 transition-colors"
            title={isComplete ? 'Neustart' : isPlaying ? 'Pause' : 'Abspielen'}
          >
            {isComplete ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" style={isPlaying ? { color: COLORS.positive } : undefined} />
            )}
          </button>
        </div>
      )}

      <div className="h-1 bg-border mx-4 mt-2 overflow-hidden shrink-0">
        <div
          className="h-full bg-accent"
          style={{ width: `${((progress + 1) / totalFrames) * 100}%` }}
        />
      </div>

      <div className="flex-1 p-4 min-h-0">
        <div className="h-full border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 250, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray={CHART_THEME.grid.strokeDasharray}
                stroke={CHART_THEME.grid.stroke}
              />
              <XAxis
                dataKey="timestamp"
                tick={CHART_THEME.axis.tick}
                tickLine={CHART_THEME.axis.tickLine}
                axisLine={CHART_THEME.axis.axisLine}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={CHART_THEME.axis.tick}
                tickLine={CHART_THEME.axis.tickLine}
                axisLine={CHART_THEME.axis.axisLine}
                tickFormatter={(value) => `${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={CHART_THEME.tooltip.contentStyle}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: COLORS.secondary }}
                formatter={(value: number, name: string) => {
                  const stock = raceStocks.find((s) => s.ticker === name);
                  return [`${formatPrice(value)} CHF`, stock?.title ?? name];
                }}
              />
              {raceStocks.map((stock) => (
                <Line
                  key={stock.ticker}
                  type="monotone"
                  dataKey={stock.ticker}
                  stroke={stock.color}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
              {sortedStocks.map((stock, index) => {
                const position = index + 1;
                return (
                  <ReferenceDot
                    key={`card-${stock.ticker}`}
                    x={currentTimestamp}
                    y={stock.raceValue}
                    r={0}
                    shape={(props) => (
                      <RaceStockCard
                        cx={props.cx ?? 0}
                        cy={props.cy ?? 0}
                        stock={stock}
                        position={position}
                      />
                    )}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RaceStockCard({
  cx,
  cy,
  stock,
  position,
}: {
  cx: number;
  cy: number;
  stock: RaceStockWithValue;
  position: number;
}) {
  const cardWidth = 220;
  const cardHeight = 50;
  const offsetX = 15;
  const offsetY = -cardHeight / 2;

  const positionColors = {
    1: { bg: COLORS.gold, text: '#000' },
    2: { bg: COLORS.silver, text: '#000' },
    3: { bg: COLORS.bronze, text: '#fff' },
  };
  const posColor = positionColors[position as 1 | 2 | 3] || { bg: COLORS.primary, text: '#000' };

  return (
    <g transform={`translate(${cx + offsetX}, ${cy + offsetY})`}>
      <rect
        x={0}
        y={0}
        width={cardWidth}
        height={cardHeight}
        fill="#000"
        stroke={COLORS.primary}
        strokeWidth={1}
      />
      <rect
        x={5}
        y={cardHeight / 2 - 12}
        width={28}
        height={24}
        fill={posColor.bg}
      />
      <text
        x={19}
        y={cardHeight / 2 + 5}
        textAnchor="middle"
        fill={posColor.text}
        fontSize={14}
        fontWeight="bold"
        fontFamily="var(--font-body), monospace"
      >
        #{position}
      </text>
      <text
        x={42}
        y={cardHeight / 2 - 5}
        fill={COLORS.primary}
        fontSize={12}
        fontWeight="600"
        fontFamily="var(--font-body), monospace"
        style={{ textTransform: 'uppercase' }}
      >
        {stock.title.length > 12 ? stock.title.slice(0, 12) + '…' : stock.title}
      </text>
      <text
        x={42}
        y={cardHeight / 2 + 12}
        fill={COLORS.secondary}
        fontSize={11}
        fontFamily="var(--font-body), monospace"
      >
        {stock.ticker}
      </text>
      <rect
        x={cardWidth - 75}
        y={cardHeight / 2 - 12}
        width={65}
        height={24}
        fill="#000"
        stroke={stock.color}
        strokeWidth={1}
      />
      <text
        x={cardWidth - 42}
        y={cardHeight / 2 + 5}
        textAnchor="middle"
        fill={stock.color}
        fontSize={13}
        fontWeight="bold"
        fontFamily="var(--font-body), monospace"
        style={{ filter: `drop-shadow(0 0 3px ${stock.color})` }}
      >
        {formatPrice(stock.raceValue, 1)}
      </text>
    </g>
  );
}
