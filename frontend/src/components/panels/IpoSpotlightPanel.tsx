'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useStocks } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';
import {
  StockPrice,
  PercentChange,
  TickerSymbol,
  StockTitle,
  DisplayLoading,
  DisplayLabel,
  DisplayEmpty,
  DisplayHeader,
  StockImage,
  Panel,
} from '@/components/display';
import { TIMINGS } from '@/constants/timings';
import { LOADING_MESSAGES, EMPTY_STATE_MESSAGES, LABELS } from '@/constants/messages';

interface IpoSpotlightPanelProps {
  /** Maximum number of IPOs to display */
  limit?: number;
  /** Whether to show a compact view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to hide the panel header */
  hideHeader?: boolean;
  /** Whether to auto-play the carousel */
  autoPlay?: boolean;
  /** Show navigation controls */
  showControls?: boolean;
  /** Show next items sidebar */
  showSidebar?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'GERADE EBEN';
  if (diffMins < 60) return `VOR ${diffMins} MIN.`;
  if (diffHours < 24) return `VOR ${diffHours} STD.`;
  if (diffDays < 7) return `VOR ${diffDays} TAG${diffDays > 1 ? 'EN' : ''}`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }).toUpperCase();
}

/**
 * Embeddable IPO Spotlight carousel panel
 */
export function IpoSpotlightPanel({
  limit = 10,
  compact = false,
  className,
  hideHeader = false,
  autoPlay = true,
  showControls = true,
  showSidebar = true,
}: IpoSpotlightPanelProps) {
  const { stocks, isLoading } = useStocks({ order: 'created_at_desc', limit });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const currentStock = useMemo(() => {
    if (stocks.length === 0) return null;
    return stocks[currentIndex % stocks.length];
  }, [stocks, currentIndex]);

  useEffect(() => {
    if (!isPlaying || stocks.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stocks.length);
    }, TIMINGS.spotlightDuration);
    return () => clearInterval(timer);
  }, [isPlaying, stocks.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + stocks.length) % stocks.length);
  }, [stocks.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % stocks.length);
  }, [stocks.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <Panel title="IPO SPOTLIGHT" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayLoading message={LOADING_MESSAGES.ipoSpotlight} />
      </Panel>
    );
  }

  if (stocks.length === 0) {
    return (
      <Panel title="IPO SPOTLIGHT" className={className} hideHeader={hideHeader} compact={compact}>
        <DisplayEmpty
          icon="IPO"
          title={EMPTY_STATE_MESSAGES.noIpo.title}
          description={EMPTY_STATE_MESSAGES.noIpo.description}
          iconSize="3xl"
        />
      </Panel>
    );
  }

  // Compact mode - simpler layout
  if (compact) {
    return (
      <Panel
        title="IPO"
        info={`${currentIndex + 1}/${stocks.length}`}
        className={className}
        hideHeader={hideHeader}
        compact
      >
        <div className="h-full flex flex-col p-2">
          {currentStock && (
            <div className="flex-1 flex items-center gap-3">
              <StockImage
                src={currentStock.image}
                alt={currentStock.title}
                ticker={currentStock.ticker}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <TickerSymbol ticker={currentStock.ticker} size="sm" />
                <StockTitle title={currentStock.title} size="xs" />
                <div className="flex items-center gap-2 mt-1">
                  <StockPrice value={currentStock.price} change={currentStock.percent_change} size="sm" />
                  <PercentChange value={currentStock.percent_change} size="xs" />
                </div>
              </div>
            </div>
          )}
          {showControls && (
            <div className="flex items-center gap-1 mt-2 justify-center">
              {stocks.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'w-2 h-2 transition-all',
                    index === currentIndex ? 'bg-accent w-4' : 'bg-primary/30'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  // Full mode with all features
  return (
    <div className={cn('relative h-full overflow-hidden bg-black', className)}>
      {/* Scanlines effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        }}
      />

      <TerminalBackground />

      {!hideHeader && (
        <DisplayHeader
          className="absolute top-0 left-0 right-0 z-20"
          overlay
          right={
            <>
              <span className="text-muted-foreground">{LABELS.newOnExchange}</span>
              <span className="text-accent">{currentIndex + 1}/{stocks.length}</span>
            </>
          }
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 pt-12">
        <AnimatePresence mode="wait">
          {currentStock && (
            <SpotlightCard key={currentStock.ticker} stock={currentStock} />
          )}
        </AnimatePresence>

        {showControls && (
          <>
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={handlePrev}
                className="p-2 border border-primary bg-black text-primary hover:bg-primary/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-1">
                {stocks.map((stock, index) => (
                  <button
                    key={stock.ticker}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'w-3 h-3 transition-all duration-300',
                      index === currentIndex
                        ? 'bg-accent w-8'
                        : 'bg-primary/30 hover:bg-primary/50'
                    )}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-2 border border-primary bg-black text-primary hover:bg-primary/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="p-2 border border-primary bg-black text-primary hover:bg-primary/20 transition-colors ml-4"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </div>

            <div className="w-64 h-1 bg-border mt-4 overflow-hidden">
              <motion.div
                key={currentIndex}
                initial={{ width: 0 }}
                animate={{ width: isPlaying ? '100%' : '0%' }}
                transition={{ duration: TIMINGS.spotlightDuration / 1000, ease: 'linear' }}
                className="h-full bg-accent"
              />
            </div>
          </>
        )}
      </div>

      {showSidebar && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 border border-border bg-black/90 p-2">
          <DisplayLabel className="mb-1">{LABELS.next}:</DisplayLabel>
          {stocks.slice(0, 5).map((stock, index) => (
            <motion.button
              key={stock.ticker}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: index === currentIndex ? 0.3 : 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'flex items-center gap-2 p-1 border border-border hover:border-primary transition-colors',
                index === currentIndex && 'opacity-30 pointer-events-none'
              )}
            >
              <StockImage
                src={stock.image}
                alt={stock.title}
                ticker={stock.ticker}
                size="sm"
                className="border"
              />
              <TickerSymbol ticker={stock.ticker} size="xs" variant="primary" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightCard({ stock }: { stock: StockResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="relative"
    >
      <div className="relative border-2 border-primary bg-black p-6 min-w-[400px]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-3 -right-3 border-2 border-accent bg-black px-3 py-1"
        >
          <span className="text-accent font-bold led-glow">★ NEU ★</span>
        </motion.div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-fit mx-auto mb-4"
        >
          <StockImage
            src={stock.image}
            alt={stock.title}
            ticker={stock.ticker}
            size="xl"
            glow
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <StockTitle title={stock.title} size="2xl" truncate={false} className="font-bold text-primary block mb-1" />
          <TickerSymbol ticker={stock.ticker} size="lg" className="mb-4" />

          {stock.description && (
            <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto line-clamp-2">
              {stock.description}
            </p>
          )}

          <div className="border-t border-b border-border py-4 my-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <DisplayLabel className="block mb-1">KURS</DisplayLabel>
                <StockPrice
                  value={stock.price}
                  change={stock.percent_change}
                  showCurrency
                  size="3xl"
                  glow
                />
              </div>

              <div className="h-12 w-px bg-border" />

              <div className="text-center">
                <DisplayLabel className="block mb-1">ÄNDERUNG</DisplayLabel>
                <PercentChange
                  value={stock.percent_change}
                  showArrow
                  size="xl"
                />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-muted-foreground"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm uppercase">
              BÖRSENGANG {formatRelativeTime(stock.created_at)}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TerminalBackground() {
  const symbols = ['$', '▲', '▼', '█', '░', '▒', '│', '─'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-primary text-xl"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            opacity: 0,
          }}
          animate={{
            opacity: [0, 0.5, 0],
            y: [null, '-100px'],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        >
          {symbols[i % symbols.length]}
        </motion.div>
      ))}
    </div>
  );
}
