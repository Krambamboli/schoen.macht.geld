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


// Extended stock info with current race value (actual price from chart)
interface RaceStockWithValue extends RaceStock {
  raceValue: number; // Current price from chart data
}

// Animation timing constants
const RACE_SYNC_INTERVAL_MS = 35000; // Must match the hook's sync interval
const END_BUFFER_MS = 5000; // Time to show completed race before new data loads

// Interpolate between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Easing function for smoother animation
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Performance Race display.
 * Shows an animated line chart racing the top stocks against each other.
 * Smooth animation interpolates between data points.
 */
export default function PerformanceRaceClient() {
  const { raceStocks, raceData, isLoading } = useRaceData(5, 30);

  // Continuous animation progress (0 to totalFrames-1)
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const totalFrames = raceData.length;
  const isComplete = progress >= totalFrames - 1;
  const currentFrame = Math.floor(progress);

  // Calculate frame duration to fit animation within sync interval minus buffer
  const frameDurationMs = useMemo(() => {
    if (totalFrames <= 1) return 1000;
    return (RACE_SYNC_INTERVAL_MS - END_BUFFER_MS) / (totalFrames - 1);
  }, [totalFrames]);

  // Track which stocks we're racing - reset when this changes
  const stockTickersKey = useMemo(() => {
    return raceStocks.map((s) => s.ticker).sort().join(',');
  }, [raceStocks]);

  const prevStockTickersRef = useRef<string>('');

  // Reset animation when stocks change
  useEffect(() => {
    if (stockTickersKey && stockTickersKey !== prevStockTickersRef.current) {
      prevStockTickersRef.current = stockTickersKey;
      setProgress(0);
      setIsPlaying(true);
    }
  }, [stockTickersKey]);

  // Smooth animation loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Calculate progress increment based on dynamic frame duration
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

  // No auto-restart - let the data refresh trigger a new race

  // Get interpolated value for a stock at current progress
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

  // Create chart data - reveal frames one at a time (no line interpolation to avoid jumps)
  const chartData = useMemo(() => {
    return raceData.map((point, index) => {
      if (index <= currentFrame) {
        return point; // Show completed frames
      }
      // Future frames - null values
      const emptyPoint: Record<string, string | null> = { timestamp: point.timestamp };
      raceStocks.forEach((stock) => {
        emptyPoint[stock.ticker] = null;
      });
      return emptyPoint;
    });
  }, [raceData, currentFrame, raceStocks]);

  // Sort stocks by their interpolated value
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

  // Get current timestamp for display (from completed frame)
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

  const stockCount = raceStocks.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-primary bg-black">
        <span className="text-2xl blink-cursor">LADE RENNDATEN</span>
      </div>
    );
  }

  if (stockCount === 0) {
    return (
      <div className="flex items-center justify-center h-full text-primary bg-black">
        <div className="border-2 border-primary p-8 text-center">
          <div className="text-2xl">KEINE AKTIEN VERFÜGBAR</div>
        </div>
      </div>
    );
  }

  if (raceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-primary bg-black">
        <div className="border-2 border-primary p-8 text-center">
          <div className="text-2xl">KEINE KURSDATEN VERFÜGBAR</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 flex flex-col bg-black text-primary">
      {/* Controls */}
      <div className="flex items-center justify-between mb-2 border-b border-border pb-1">
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
            <Play className={cn('w-4 h-4', isPlaying && 'text-green-500')} />
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border mb-2 overflow-hidden">
        <div
          className="h-full bg-accent"
          style={{ width: `${((progress + 1) / totalFrames) * 100}%` }}
        />
      </div>

      {/* Main content: Chart + Legend */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chart */}
        <div className="flex-1 min-w-0 border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 250, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="1 1" stroke="rgba(255, 153, 0, 0.2)" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: '#ff9900', fontSize: 12 }}
                tickLine={{ stroke: '#ff9900' }}
                axisLine={{ stroke: '#ff9900', strokeWidth: 2 }}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fill: '#ff9900', fontSize: 12 }}
                tickLine={{ stroke: '#ff9900' }}
                axisLine={{ stroke: '#ff9900', strokeWidth: 2 }}
                tickFormatter={(value) => `${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '2px solid #ff9900',
                  borderRadius: '0',
                  color: '#ff9900',
                  fontFamily: 'var(--font-body), monospace',
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffcc00' }}
                formatter={(value: number, name: string) => {
                  const stock = raceStocks.find((s) => s.ticker === name);
                  return [`${value.toFixed(2)} CHF`, stock?.title ?? name];
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
              {/* Stock cards positioned at line endpoints */}
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

// SVG-based stock card for positioning at line endpoints - terminal style
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

  // Position colors for medals - terminal style
  const positionColors = {
    1: { bg: '#ffcc00', text: '#000' }, // gold
    2: { bg: '#9ca3af', text: '#000' }, // silver
    3: { bg: '#b45309', text: '#fff' }, // bronze
  };
  const posColor = positionColors[position as 1 | 2 | 3] || { bg: '#ff9900', text: '#000' };

  return (
    <g transform={`translate(${cx + offsetX}, ${cy + offsetY})`}>
      {/* Card background - terminal style */}
      <rect
        x={0}
        y={0}
        width={cardWidth}
        height={cardHeight}
        fill="#000"
        stroke="#ff9900"
        strokeWidth={1}
      />

      {/* Position badge - square terminal style */}
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

      {/* Stock title */}
      <text
        x={42}
        y={cardHeight / 2 - 5}
        fill="#ff9900"
        fontSize={12}
        fontWeight="600"
        fontFamily="var(--font-body), monospace"
        style={{ textTransform: 'uppercase' }}
      >
        {stock.title.length > 12 ? stock.title.slice(0, 12) + '…' : stock.title}
      </text>

      {/* Stock ticker */}
      <text
        x={42}
        y={cardHeight / 2 + 12}
        fill="#ffcc00"
        fontSize={11}
        fontFamily="var(--font-body), monospace"
      >
        {stock.ticker}
      </text>

      {/* Price value - terminal LED style */}
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
        {stock.raceValue.toFixed(1)}
      </text>
    </g>
  );
}