'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useStocks } from '@/hooks/use-stocks';
import {
  StockPrice,
  PercentChange,
  AbsoluteChange,
  TickerSymbol,
  StockTitle,
  ChangeArrow,
  DisplayLoading,
  DisplayLabel,
  DisplayHeader,
  Panel,
} from '@/components/display';
import { LOADING_MESSAGES, LABELS } from '@/constants/messages';
import { TIMINGS } from '@/constants/timings';

interface TerminalPanelProps {
  /** Maximum number of rows to display */
  limit?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Enable auto-scrolling (bounces between top and bottom) */
  autoScroll?: boolean;
  /** Show auto-scroll toggle button */
  showAutoScrollToggle?: boolean;
  /** Show absolute change column */
  showAbsoluteChange?: boolean;
}

/**
 * Embeddable terminal-style stock table
 */
export function TerminalPanel({
  limit,
  compact = false,
  className,
  hideHeader = false,
  autoScroll = false,
  showAutoScrollToggle = false,
  showAbsoluteChange = false,
}: TerminalPanelProps) {
  const { stocks, isLoading } = useStocks();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');

  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    return limit ? sorted.slice(0, limit) : sorted;
  }, [stocks, limit]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isAutoScrolling) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationId: number;
    let lastTime = performance.now();
    let isPaused = false;
    let pauseTimeout: NodeJS.Timeout;

    const scroll = (currentTime: number) => {
      if (isPaused) {
        animationId = requestAnimationFrame(scroll);
        return;
      }

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const scrollAmount = TIMINGS.autoScrollSpeed * deltaTime;
      const maxScroll = container.scrollHeight - container.clientHeight;

      if (scrollDirection === 'down') {
        container.scrollTop += scrollAmount;
        if (container.scrollTop >= maxScroll - 1) {
          isPaused = true;
          pauseTimeout = setTimeout(() => {
            setScrollDirection('up');
            isPaused = false;
          }, TIMINGS.scrollPause);
        }
      } else {
        container.scrollTop -= scrollAmount;
        if (container.scrollTop <= 1) {
          isPaused = true;
          pauseTimeout = setTimeout(() => {
            setScrollDirection('down');
            isPaused = false;
          }, TIMINGS.scrollPause);
        }
      }

      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(pauseTimeout);
    };
  }, [isAutoScrolling, scrollDirection]);

  const handleUserScroll = useCallback(() => {
    if (!autoScroll) return;
    setIsAutoScrolling(false);
    const timeout = setTimeout(() => setIsAutoScrolling(true), TIMINGS.userScrollResume);
    return () => clearTimeout(timeout);
  }, [autoScroll]);

  if (isLoading && stocks.length === 0) {
    return (
      <Panel title="TERMINAL" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.terminal} />
      </Panel>
    );
  }

  // Use Panel for embedded views, custom header for full-page with scroll toggle
  if (showAutoScrollToggle && !hideHeader) {
    return (
      <div className={cn('flex flex-col bg-black text-primary overflow-hidden', className)}>
        <DisplayHeader
          stockCount={sortedStocks.length}
          right={
            <button
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={cn(
                'text-xs px-2 py-0.5 border font-bold',
                isAutoScrolling
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted-foreground text-muted-foreground'
              )}
            >
              {isAutoScrolling ? `▶ ${LABELS.autoScroll}` : `■ ${LABELS.pause}`}
            </button>
          }
        />
        <div
          ref={scrollContainerRef}
          onWheel={handleUserScroll}
          onTouchStart={handleUserScroll}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
        >
          <TerminalTable
            stocks={sortedStocks}
            compact={compact}
            showAbsoluteChange={showAbsoluteChange}
          />
        </div>
      </div>
    );
  }

  return (
    <Panel
      title="TERMINAL"
      info={`${sortedStocks.length} TITEL`}
      className={className}
      hideHeader={hideHeader}
      compact={compact}
    >
      <div
        ref={scrollContainerRef}
        onWheel={handleUserScroll}
        onTouchStart={handleUserScroll}
        className="overflow-auto h-full scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
      >
        <TerminalTable
          stocks={sortedStocks}
          compact={compact}
          showAbsoluteChange={showAbsoluteChange}
        />
      </div>
    </Panel>
  );
}

interface TerminalTableProps {
  stocks: ReturnType<typeof useStocks>['stocks'];
  compact?: boolean;
  showAbsoluteChange?: boolean;
}

function TerminalTable({ stocks, compact = false, showAbsoluteChange = false }: TerminalTableProps) {
  return (
    <Table className="alternating-rows">
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className={cn('w-5', compact ? 'px-0.5 h-6' : 'px-2 h-8')} />
          <TableHead className={compact ? 'px-0.5 h-6' : 'px-2 h-8'}>
            <DisplayLabel>{LABELS.ticker}</DisplayLabel>
          </TableHead>
          <TableHead className={compact ? 'px-0.5 h-6' : 'px-2 h-8'}>
            <DisplayLabel>{LABELS.name}</DisplayLabel>
          </TableHead>
          <TableHead className={cn('text-right', compact ? 'px-0.5 h-6' : 'px-2 h-8')}>
            <DisplayLabel>{LABELS.price}</DisplayLabel>
          </TableHead>
          {showAbsoluteChange && (
            <TableHead className={cn('text-right', compact ? 'px-0.5 h-6' : 'px-2 h-8')}>
              <DisplayLabel>{LABELS.change}</DisplayLabel>
            </TableHead>
          )}
          <TableHead className={cn('text-right', compact ? 'pl-0.5 pr-1 h-6' : 'px-2 h-8')}>
            <DisplayLabel>{LABELS.percent}</DisplayLabel>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock, index) => (
          <TableRow
            key={stock.ticker}
            className={cn(
              'border-border/50 hover:bg-primary/10',
              index % 2 === 0 ? 'bg-transparent' : 'bg-primary/5'
            )}
          >
            <TableCell className={compact ? 'w-5 px-0.5 py-0.5' : 'w-10 px-2 py-1'}>
              <ChangeArrow
                value={
                  stock.rank && stock.previous_rank
                    ? stock.previous_rank - stock.rank
                    : 0
                }
                variant="symbol"
                size={compact ? 'xs' : 'md'}
              />
            </TableCell>
            <TableCell className={compact ? 'px-0.5 py-0.5' : 'px-2 py-1'}>
              <TickerSymbol ticker={stock.ticker} size={compact ? 'xs' : 'sm'} />
            </TableCell>
            <TableCell className={compact ? 'px-0.5 py-0.5' : 'px-2 py-1'}>
              <StockTitle title={stock.title} size="xs" className="truncate max-w-[140px]" />
            </TableCell>
            <TableCell className={cn('text-right', compact ? 'px-0.5 py-0.5' : 'px-2 py-1')}>
              <StockPrice
                value={stock.price}
                change={stock.change}
                flash
                trackingKey={stock.ticker}
                size={compact ? 'xs' : 'sm'}
              />
            </TableCell>
            {showAbsoluteChange && (
              <TableCell className={cn('text-right', compact ? 'px-0.5 py-0.5' : 'px-2 py-1')}>
                <AbsoluteChange
                  value={stock.change}
                  showNeutral
                  flash
                  trackingKey={stock.ticker}
                  size={compact ? 'xs' : 'sm'}
                />
              </TableCell>
            )}
            <TableCell className={cn('text-right', compact ? 'pl-0.5 pr-1 py-0.5' : 'px-2 py-1')}>
              <PercentChange
                value={stock.percent_change}
                showNeutral
                flash
                trackingKey={stock.ticker}
                size={compact ? 'xs' : 'sm'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
