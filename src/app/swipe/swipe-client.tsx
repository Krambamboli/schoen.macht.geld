'use client';

import { Stock } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, Loader2 } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, arrayUnion, runTransaction } from 'firebase/firestore';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

export default function SwipeClient() {
  const { firestore, auth, user, isUserLoading } = useFirebase();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  const titlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'titles') : null, [firestore]);
  const { data: stocks, isLoading: isLoadingStocks } = useCollection<Stock>(titlesCollection);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!firestore || !stocks || stocks.length === 0) return;

    const stockToUpdate = stocks[currentIndex % stocks.length];
    if (!stockToUpdate) return;
    
    const exitX = direction === 'right' ? 300 : -300;
    animate(x, exitX, {
      duration: 0.3,
      onComplete: async () => {
        const valueChange = direction === 'right' ? 0.1 : -0.1;
        const stockRef = doc(firestore, 'titles', stockToUpdate.id);

        try {
           await runTransaction(firestore, async (transaction) => {
              const stockDoc = await transaction.get(stockRef);
              if (!stockDoc.exists()) {
                throw "Document does not exist!";
              }

              const currentData = stockDoc.data() as Stock;
              const newValue = currentData.currentValue + valueChange;
              const newChange = newValue - currentData.initialValue;
              const newPercentChange = (newChange / currentData.initialValue) * 100;
              
              let newHistory = [...currentData.history, { value: newValue, timestamp: new Date().toISOString() }];
              if (newHistory.length > 100) {
                newHistory = newHistory.slice(newHistory.length - 100);
              }

              transaction.update(stockRef, { 
                currentValue: newValue,
                change: newChange,
                percentChange: newPercentChange,
                history: newHistory,
              });
           });

        } catch (e) {
          console.error("Transaction failed: ", e);
        }

        setCurrentIndex((prev) => (prev + 1));
        x.set(0);
      },
    });
  };

  const currentStock = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    return stocks[currentIndex % stocks.length];
  }, [stocks, currentIndex]);

  const isLoading = isLoadingStocks || isUserLoading;

  if (isLoading) {
     return (
      <div className="text-center flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h2 className="text-2xl font-bold">Loading Market...</h2>
        <p className="text-muted-foreground">
          Getting the latest stock profiles ready for you.
        </p>
      </div>
    );
  }

  if (!currentStock) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">No stocks available yet!</h2>
        <p className="text-muted-foreground">
          Go to the registration station to become the first stock.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          key={currentStock.id}
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
                src={currentStock.photoUrl}
                alt={currentStock.nickname}
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
                <h2 className="text-4xl font-bold font-headline">
                  {currentStock.nickname}
                </h2>
                <p className="text-2xl font-mono text-green-300">
                  ${currentStock.currentValue.toFixed(2)}
                </p>
              </div>
              <p className="mt-2 text-lg text-white/80">
                {currentStock.description}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex gap-8 mt-4 z-50 absolute bottom-10">
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-red-500/50 text-red-500 hover:bg-red-500/20 hover:text-red-400"
            onClick={() => handleSwipe('left')}
            disabled={!user}
          >
            <X className="w-12 h-12" />
          </Button>
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-green-400/50 text-green-400 hover:bg-green-400/20 hover:text-green-300"
            onClick={() => handleSwipe('right')}
            disabled={!user}
          >
            <Heart className="w-12 h-12" />
          </Button>
        </div>
    </div>
  );
}
