'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Clock, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useStocks } from '@/hooks/use-stocks';
import type { StockResponse } from '@/lib/api/client';


// How long each stock stays in the spotlight
const SPOTLIGHT_DURATION_MS = 8000;

// Format relative time in German (uppercase for terminal style)
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

export default function IpoSpotlightClient() {
  const { stocks, isLoading } = useStocks({ order: 'created_at_desc', limit: 10 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentStock = useMemo(() => {
    if (stocks.length === 0) return null;
    return stocks[currentIndex % stocks.length];
  }, [stocks, currentIndex]);

  // Auto-advance to next stock
  useEffect(() => {
    if (!isPlaying || stocks.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stocks.length);
    }, SPOTLIGHT_DURATION_MS);

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
      <div className="flex items-center justify-center h-full bg-black">
        <span className="text-2xl text-primary blink-cursor">LADE IPO-DATEN</span>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-primary">
        <div className="text-center border-2 border-primary p-8">
          <div className="text-6xl mb-4 led-glow">IPO</div>
          <h2 className="text-2xl font-bold">NOCH KEINE BÖRSENGÄNGE</h2>
          <p className="text-muted-foreground mt-2">WARTE AUF ERSTE AKTIEN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)'
        }}
      />

      {/* Animated terminal cursor background */}
      <TerminalBackground />

      {/* Info bar */}
      <div className="absolute top-0 left-0 right-0 z-20 border-b border-border bg-black/90 px-4 py-1">
        <div className="flex items-center justify-end gap-4 text-sm">
          <span className="text-muted-foreground">NEU AN DER BÖRSE</span>
          <span className="text-accent">{currentIndex + 1}/{stocks.length}</span>
        </div>
      </div>

      {/* Main spotlight area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 pt-12">
        {/* Spotlight content */}
        <AnimatePresence mode="wait">
          {currentStock && (
            <SpotlightCard key={currentStock.ticker} stock={currentStock} />
          )}
        </AnimatePresence>

        {/* Navigation controls */}
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
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-border mt-4 overflow-hidden">
          <motion.div
            key={currentIndex}
            initial={{ width: 0 }}
            animate={{ width: isPlaying ? '100%' : '0%' }}
            transition={{ duration: SPOTLIGHT_DURATION_MS / 1000, ease: 'linear' }}
            className="h-full bg-accent"
          />
        </div>
      </div>

      {/* Queue preview on the right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 border border-border bg-black/90 p-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">NÄCHSTE:</span>
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
            <div className="relative w-6 h-6 overflow-hidden border border-primary">
              {stock.image ? (
                <Image
                  unoptimized
                  src={stock.image}
                  alt={stock.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                  {stock.ticker.slice(0, 2)}
                </div>
              )}
            </div>
            <span className="text-primary text-xs">{stock.ticker}</span>
          </motion.button>
        ))}
      </div>

    </div>
  );
}

function SpotlightCard({ stock }: { stock: StockResponse }) {
  const isPositive = stock.percent_change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="relative"
    >
      {/* Terminal-style card */}
      <div className="relative border-2 border-primary bg-black p-6 min-w-[400px]">
        {/* NEW badge - terminal style */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-3 -right-3 border-2 border-accent bg-black px-3 py-1"
        >
          <span className="text-accent font-bold led-glow">★ NEU ★</span>
        </motion.div>

        {/* Stock image - square terminal style */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative w-40 h-40 mx-auto border-2 border-primary overflow-hidden mb-4"
          style={{ boxShadow: '0 0 20px rgba(255, 153, 0, 0.3)' }}
        >
          {stock.image ? (
            <Image
              unoptimized
              src={stock.image}
              alt={stock.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary">
              {stock.ticker.slice(0, 2)}
            </div>
          )}
        </motion.div>

        {/* Stock info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-primary mb-1">{stock.title}</h2>
          <p className="text-lg text-accent font-bold mb-4">{stock.ticker}</p>

          {stock.description && (
            <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto line-clamp-2">
              {stock.description}
            </p>
          )}

          {/* Price display - terminal style */}
          <div className="border-t border-b border-border py-4 my-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">KURS</p>
                <p className="text-3xl font-bold text-green-500 led-glow">
                  {stock.price.toFixed(2)}
                  <span className="text-lg text-muted-foreground ml-1">CHF</span>
                </p>
              </div>

              <div className="h-12 w-px bg-border" />

              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">ÄNDERUNG</p>
                <p
                  className={cn(
                    'text-xl font-bold flex items-center justify-center gap-1',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {isPositive ? '▲' : '▼'}
                  {isPositive ? '+' : ''}
                  {stock.percent_change.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* IPO time - terminal style */}
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
  // Generate floating ticker symbols for background
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
