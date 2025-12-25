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
        <h2 className="text-2xl font-bold">Lade Markt...</h2>
        <p className="text-muted-foreground">Die neusten Profile werden für dich vorbereitet.</p>
      </div>
    );
  }

  if (!currentStock) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Noch keine Aktien verfügbar!</h2>
        <p className="text-muted-foreground">
          Geh zur Admin-Seite, um die erste Aktie zu erstellen.
        </p>
      </div>
    );
  }

  const imageUrl = currentStock.image || '/placeholder.png';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          key={currentStock.ticker}
          className="absolute w-[90vw] h-[80vh] max-w-sm max-h-[600px]"
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
          <Card className="relative w-full h-full overflow-hidden shadow-2xl shadow-black/20">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>

            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute top-8 left-8 rotate-[-30deg] border-4 border-green-400 text-green-400 text-5xl font-bold p-4 rounded-xl"
              >
                LIKE
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="absolute top-8 right-8 rotate-[30deg] border-4 border-red-500 text-red-500 text-5xl font-bold p-4 rounded-xl"
              >
                NOPE
              </motion.div>
            </>

            <CardContent className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-baseline gap-4">
                <h2 className="text-4xl font-bold font-headline">{currentStock.title}</h2>
                <p className="text-2xl font-mono text-green-300">
                  {currentStock.price.toFixed(2)} CHF
                </p>
              </div>
              <p className="mt-2 text-lg text-white/80">{currentStock.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex gap-8 mt-4 z-50 absolute bottom-10">
        <Button
          variant="outline"
          className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-red-500/50 text-red-500 hover:bg-red-500/20 hover:text-red-400"
          onClick={() => handleSwipe('left')}
          disabled={isSubmitting}
        >
          <X className="w-12 h-12" />
        </Button>
        <Button
          variant="outline"
          className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-green-400/50 text-green-400 hover:bg-green-400/20 hover:text-green-300"
          onClick={() => handleSwipe('right')}
          disabled={isSubmitting}
        >
          <Heart className="w-12 h-12" />
        </Button>
      </div>
    </div>
  );
}
