'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { TrendingUp } from 'lucide-react';
import type { StockEvent } from '@/contexts/events-context';

interface AllTimeHighProps {
  event: StockEvent;
  onComplete: () => void;
}

const ANIMATION_DURATION = 6000;

export function AllTimeHigh({ event, onComplete }: AllTimeHighProps) {
  const [phase, setPhase] = useState<'alert' | 'reveal' | 'display' | 'exit'>('alert');
  const stock = event.stock;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 800),
      setTimeout(() => setPhase('display'), 2000),
      setTimeout(() => setPhase('exit'), ANIMATION_DURATION - 800),
      setTimeout(onComplete, ANIMATION_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Generate rising arrow indicators
  const arrows = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: 5 + (i % 10) * 10,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden"
        onClick={onComplete}
      >
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-50"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)'
          }}
        />

        {/* Rising arrows background */}
        {phase === 'display' && arrows.map((arrow) => (
          <motion.div
            key={arrow.id}
            initial={{ y: '100vh', opacity: 0 }}
            animate={{ y: '-20vh', opacity: [0, 0.3, 0] }}
            transition={{ duration: arrow.duration, delay: arrow.delay, repeat: Infinity }}
            className="absolute text-4xl text-green-500/30"
            style={{ left: `${arrow.x}%` }}
          >
            ▲
          </motion.div>
        ))}

        {/* Alert header bar */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="bg-green-700 border-b-4 border-green-900"
        >
          <div className="flex items-center justify-center py-3 gap-4">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="text-2xl"
            >
              ▲▲▲
            </motion.div>
            <span className="text-3xl font-bold text-white tracking-widest">ALLZEITHOCH</span>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="text-2xl"
            >
              ▲▲▲
            </motion.div>
          </div>
        </motion.div>

        {/* Scrolling ticker */}
        <div className="bg-green-900/50 border-b border-green-700 overflow-hidden">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '-100%' }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="py-1 text-green-400 font-bold whitespace-nowrap"
          >
            {'█ NEUES ALLZEITHOCH █ '.repeat(10)} {stock.ticker} █ {stock.price.toFixed(2)} CHF █
          </motion.div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase === 'exit' ? 0.8 : 1,
              opacity: phase === 'exit' ? 0 : 1,
            }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="text-center"
          >
            {/* ATH Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="inline-flex items-center gap-3 border-4 border-green-500 bg-black px-6 py-3 mb-8"
            >
              <TrendingUp className="w-10 h-10 text-green-500" />
              <span className="text-4xl font-bold text-green-500 led-glow">ATH</span>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </motion.div>

            {/* Stock display - terminal style */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="border-2 border-green-500 bg-black p-6 max-w-lg mx-auto"
            >
              <div className="flex items-start gap-6">
                {/* Stock image */}
                <motion.div
                  animate={{
                    boxShadow: ['0 0 10px #22c55e', '0 0 30px #22c55e', '0 0 10px #22c55e']
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="relative w-28 h-28 border-2 border-green-500 overflow-hidden flex-shrink-0"
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
                    <div className="w-full h-full bg-green-900/50 flex items-center justify-center text-2xl font-bold text-green-500">
                      {stock.ticker.slice(0, 2)}
                    </div>
                  )}
                </motion.div>

                {/* Stock info */}
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-primary mb-1">{stock.title}</h2>
                  <p className="text-xl text-accent font-bold mb-4">{stock.ticker}</p>

                  {/* Price chart simulation */}
                  <div className="flex items-end gap-1 h-8 mb-2">
                    {[40, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1 + i * 0.05 }}
                        className="w-2 bg-green-500"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Price display */}
              <div className="border-t border-green-500/50 mt-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">NEUER REKORD:</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: 'spring' }}
                    className="text-4xl font-bold text-green-500 led-glow"
                  >
                    {stock.price.toFixed(2)} CHF
                  </motion.span>
                </div>

                {/* Previous high comparison */}
                {event.metadata?.previousPrice && (
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">VORHERIGES HOCH:</span>
                    <span className="text-muted-foreground line-through">
                      {event.metadata.previousPrice.toFixed(2)} CHF
                    </span>
                  </div>
                )}

                {/* Change */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">VERÄNDERUNG:</span>
                  <span className="text-xl font-bold text-green-500">
                    ▲ +{stock.percent_change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tap to dismiss */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 3 }}
              className="mt-6 text-sm text-muted-foreground"
            >
              ─── TIPPEN ZUM SCHLIESSEN ───
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom status bar */}
        <div className="bg-green-900/50 border-t border-green-700 py-2 px-4">
          <div className="flex items-center justify-between text-sm text-green-400">
            <span>┌─ SMG BÖRSE ─┐</span>
            <span>LIVE │ ALLZEITHOCH ERREICHT</span>
            <span>┌─ {new Date().toLocaleTimeString('de-DE')} ─┐</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}