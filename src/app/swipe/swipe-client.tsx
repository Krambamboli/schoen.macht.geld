'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Stock } from '@/lib/types';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SwipeClient({
  initialStocks,
}: {
  initialStocks: Stock[];
}) {
  const [stocks, setStocks] = useState(initialStocks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const currentStock = stocks[currentIndex];

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleSwipe = (direction: 'left' | 'right') => {
    // In a real app, send the vote to the backend
    console.log(
      `Swiped ${direction} on ${stocks[currentIndex].nickname}. New value would be ${
        stocks[currentIndex].value + (direction === 'right' ? 0.1 : -0.1)
      }`
    );

    // Animate card out
    const exitX = direction === 'right' ? 300 : -300;
    animate(x, exitX, {
      duration: 0.3,
      onComplete: () => {
        setCurrentIndex((prev) => prev + 1);
      },
    });
  };

  useEffect(() => {
    // Reset motion value for the next card
    if (currentIndex < stocks.length) {
      x.set(0);
    }
  }, [currentIndex, x, stocks.length]);

  if (currentIndex >= stocks.length) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">All stocks rated!</h2>
        <p className="text-muted-foreground">
          Check the market displays to see the results.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        {stocks.map((stock, index) => {
          if (index < currentIndex) return null;
          if (index > currentIndex + 2) return null; // Render only a few cards for performance

          const isTopCard = index === currentIndex;

          return (
            <motion.div
              key={stock.id}
              className="absolute w-[90vw] h-[80vh] max-w-sm max-h-[600px]"
              style={
                isTopCard
                  ? { x, rotate, opacity, zIndex: stocks.length - index }
                  : {
                      scale: 1 - (index - currentIndex) * 0.05,
                      y: (index - currentIndex) * -20,
                      opacity: 1 - (index - currentIndex) * 0.1,
                      zIndex: stocks.length - index,
                    }
              }
              drag={isTopCard && isTouchDevice ? 'x' : false}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={(e, { offset }) => {
                if (offset.x > 100) {
                  handleSwipe('right');
                } else if (offset.x < -100) {
                  handleSwipe('left');
                }
              }}
              animate={{
                y: (index - currentIndex) * -20,
                scale: 1 - (index - currentIndex) * 0.05,
              }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative w-full h-full overflow-hidden shadow-2xl shadow-black/20">
                <div className="absolute inset-0 w-full h-full">
                  <Image
                    src={stock.photoUrl}
                    alt={stock.nickname}
                    data-ai-hint="person portrait"
                    fill
                    className="object-cover"
                    priority={isTopCard}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </div>

                {isTopCard && (
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
                )}

                <CardContent className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-4xl font-bold font-headline">
                      {stock.nickname}
                    </h2>
                    <p className="text-2xl font-mono text-green-300">
                      ${stock.value.toFixed(2)}
                    </p>
                  </div>
                  <p className="mt-2 text-lg text-white/80">
                    {stock.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!isTouchDevice && (
        <div className="flex gap-8 mt-4 z-50 absolute bottom-10">
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-red-500/50 text-red-500 hover:bg-red-500/20 hover:text-red-400"
            onClick={() => handleSwipe('left')}
          >
            <X className="w-12 h-12" />
          </Button>
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-green-400/50 text-green-400 hover:bg-green-400/20 hover:text-green-300"
            onClick={() => handleSwipe('right')}
          >
            <Heart className="w-12 h-12" />
          </Button>
        </div>
      )}
    </div>
  );
}
