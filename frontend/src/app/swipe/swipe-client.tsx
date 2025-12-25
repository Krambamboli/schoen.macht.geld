'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, Loader2 } from 'lucide-react';
import { useStocks, submitSwipe } from '@/hooks/use-stocks';
import type { SwipeDirection, StockResponse } from '@/lib/api/client';

// Minimum stocks remaining before fetching more
const LOW_STOCK_THRESHOLD = 3;

/**
 * The main client component for the Swipe Kiosk.
 * This component is the engine of the market, allowing users to influence stock values.
 * It fetches stocks from the API, displays them as swipeable cards, and on swipe,
 * calls the backend to update the stock's value.
 *
 * Optimized to maintain a local queue of stocks and only fetch more when running low.
 * Price updates come via WebSocket, so no need to refetch after each swipe.
 */
export default function SwipeClient() {
  const { stocks, isLoading } = useStocks({ order: 'random' });
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const [swipeToken, setSwipeToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queue of stocks to swipe through (shuffled once, cycles infinitely)
  const [stockQueue, setStockQueue] = useState<StockResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track if initial load has happened
  const initialLoadDoneRef = useRef(false);

  // Initialize queue with first batch of stocks (shuffled)
  useEffect(() => {
    if (stocks.length > 0 && !initialLoadDoneRef.current) {
      const shuffled = [...stocks].sort(() => Math.random() - 0.5);
      setStockQueue(shuffled);
      initialLoadDoneRef.current = true;
    }
  }, [stocks]);

  // Update stock data in queue when WebSocket pushes updates (prices change)
  // Also add any new stocks that weren't in the initial load
  useEffect(() => {
    if (stocks.length === 0 || !initialLoadDoneRef.current) return;

    const stocksMap = new Map(stocks.map((s) => [s.ticker, s]));

    setStockQueue((prev) => {
      const queueTickers = new Set(prev.map((s) => s.ticker));

      // Update existing stocks with fresh data
      const updated = prev.map((queuedStock) => {
        const freshData = stocksMap.get(queuedStock.ticker);
        return freshData || queuedStock;
      });

      // Find and append any new stocks (shuffled)
      const newStocks = stocks.filter((s) => !queueTickers.has(s.ticker));
      if (newStocks.length > 0) {
        const shuffledNew = [...newStocks].sort(() => Math.random() - 0.5);
        return [...updated, ...shuffledNew];
      }

      return updated;
    });
  }, [stocks]);

  // Detect if the device has touch capabilities
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Framer Motion values for card animations
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  // Get current stock from queue (cycles through infinitely)
  const currentStock = stockQueue.length > 0
    ? stockQueue[currentIndex % stockQueue.length]
    : null;

  /**
   * Handles the swipe action, either from a drag gesture or a button click.
   * It animates the card off-screen and then calls the backend to update the stock.
   * No refetch needed - WebSocket pushes price updates.
   */
  const handleSwipe = useCallback(async (direction: SwipeDirection) => {
    if (!currentStock || isSubmitting) return;

    setIsSubmitting(true);

    const exitX = direction === 'right' ? 300 : -300;
    animate(x, exitX, {
      duration: 0.3,
      onComplete: async () => {
        setCurrentIndex((prevIndex) => prevIndex + 1);
        x.set(0);

        try {
          const result = await submitSwipe(currentStock.ticker, direction, swipeToken);
          if (result) {
            setSwipeToken(result.token);
          }
          // No mutate() needed - WebSocket will push the price update
        } catch (error) {
          console.error('Swipe failed:', error);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }, [currentStock, isSubmitting, swipeToken, x]);

  // Handle arrow key presses for swiping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, handleSwipe]);

  if (isLoading && stockQueue.length === 0) {
    return (
      <div className="text-center flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h2 className="text-2xl font-bold text-primary">LADE MARKT...</h2>
        <p className="text-muted-foreground">PROFILE WERDEN VORBEREITET</p>
      </div>
    );
  }

  if (!currentStock) {
    return (
      <div className="text-center border-2 border-primary p-8 bg-black">
        <h2 className="text-2xl font-bold text-primary">KEINE AKTIEN VERFÜGBAR</h2>
        <p className="text-muted-foreground mt-2">
          ADMIN-SEITE AUFRUFEN UM ERSTE AKTIE ZU ERSTELLEN
        </p>
      </div>
    );
  }

  const imageUrl = currentStock.image || '/placeholder.png';
  const isPositive = currentStock.percent_change >= 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Header info bar */}
      <div className="absolute top-16 left-0 right-0 z-10 px-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground border border-border bg-black/80 px-3 py-1">
          <span>┌─ STOCK SWIPE ─┐</span>
          <span>#{currentIndex + 1} / {stockQueue.length}</span>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          key={currentStock.ticker}
          className="absolute w-[90vw] h-[75vh] max-w-sm max-h-[550px]"
          style={{ x, rotate, opacity, zIndex: 1 }}
          drag={isTouchDevice ? 'x' : false}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          onDragEnd={(e, { offset }) => {
            if (offset.x > 100) {
              handleSwipe('right');
            } else if (offset.x < -100) {
              handleSwipe('left');
            } else {
              animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
            }
          }}
          transition={{ duration: 0.3 }}
        >
          <Card className="relative w-full h-full overflow-hidden border-2 border-primary bg-black">
            {/* Image area */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                unoptimized
                src={imageUrl}
                alt={currentStock.title}
                data-ai-hint="person portrait"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Swipe indicators */}
            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute top-6 left-6 rotate-[-15deg] border-4 border-green-500 text-green-500 text-4xl font-bold px-4 py-2 bg-black/80"
              >
                ▲ BUY
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="absolute top-6 right-6 rotate-[15deg] border-4 border-red-500 text-red-500 text-4xl font-bold px-4 py-2 bg-black/80"
              >
                ▼ SELL
              </motion.div>
            </>

            {/* Stock info panel */}
            <CardContent className="absolute bottom-0 left-0 right-0 p-0 text-white">
              {/* Ticker header */}
              <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
                <span className="text-2xl font-bold">{currentStock.ticker}</span>
                <span className={`text-xl font-bold ${isPositive ? 'text-green-900' : 'text-red-900'}`}>
                  {isPositive ? '▲' : '▼'} {currentStock.percent_change >= 0 ? '+' : ''}{currentStock.percent_change.toFixed(1)}%
                </span>
              </div>

              {/* Stock details */}
              <div className="bg-black/90 p-4 border-t border-border">
                <h2 className="text-2xl font-bold text-primary mb-1">{currentStock.title}</h2>

                {/* Price display */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className={`text-3xl font-bold led-glow ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {currentStock.price.toFixed(2)}
                  </span>
                  <span className="text-lg text-muted-foreground">CHF</span>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">{currentStock.description}</p>

                {/* Rank info */}
                {currentStock.rank && (
                  <div className="mt-2 pt-2 border-t border-border text-sm">
                    <span className="text-muted-foreground">RANG: </span>
                    <span className="text-accent font-bold">#{currentStock.rank}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-6 z-50 absolute bottom-8">
        <Button
          variant="outline"
          className="w-20 h-20 border-4 border-red-500 bg-black text-red-500 hover:bg-red-500/20 hover:text-red-400 flex flex-col gap-1"
          onClick={() => handleSwipe('left')}
          disabled={isSubmitting}
        >
          <X className="w-8 h-8" />
          <span className="text-xs font-bold">SELL</span>
        </Button>
        <Button
          variant="outline"
          className="w-20 h-20 border-4 border-green-500 bg-black text-green-500 hover:bg-green-500/20 hover:text-green-400 flex flex-col gap-1"
          onClick={() => handleSwipe('right')}
          disabled={isSubmitting}
        >
          <Heart className="w-8 h-8" />
          <span className="text-xs font-bold">BUY</span>
        </Button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-2 text-xs text-muted-foreground">
        ← SELL │ BUY →
      </div>
    </div>
  );
}
