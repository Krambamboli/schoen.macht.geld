'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Crown } from 'lucide-react';
import type { StockEvent } from '@/contexts/events-context';

interface NewLeaderCelebrationProps {
  event: StockEvent;
  onComplete: () => void;
}

const ANIMATION_DURATION = 8000;

export function NewLeaderCelebration({ event, onComplete }: NewLeaderCelebrationProps) {
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'ticker' | 'exit'>('intro');
  const stock = event.stock;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 1000),
      setTimeout(() => setPhase('ticker'), 2500),
      setTimeout(() => setPhase('exit'), ANIMATION_DURATION - 1000),
      setTimeout(onComplete, ANIMATION_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Ticker tape characters
  const tickerText = `████ NEUER #1 ████ ${stock.ticker} ████ ${stock.price.toFixed(2)} CHF ████ NEUER SPITZENREITER ████ `;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black"
        onClick={onComplete}
      >
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-50"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)'
          }}
        />

        {/* Top ticker tape */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: '-100%' }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="bg-primary text-primary-foreground py-2 text-xl font-bold whitespace-nowrap overflow-hidden"
        >
          {tickerText.repeat(5)}
        </motion.div>

        {/* Breaking news header */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-red-700 text-white py-3 border-y-4 border-red-900"
        >
          <div className="flex items-center justify-center gap-4">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-2xl font-bold"
            >
              ▌▌▌
            </motion.span>
            <span className="text-3xl font-bold tracking-widest">BREAKING NEWS</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-2xl font-bold"
            >
              ▐▐▐
            </motion.span>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase === 'exit' ? 0.8 : 1,
              opacity: phase === 'exit' ? 0 : 1,
            }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
            className="text-center"
          >
            {/* Crown with glow */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mb-6"
            >
              <motion.div
                animate={{
                  textShadow: ['0 0 20px #ff9900', '0 0 60px #ff9900', '0 0 20px #ff9900']
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Crown className="w-20 h-20 text-accent" style={{ filter: 'drop-shadow(0 0 10px #ffcc00)' }} />
              </motion.div>
            </motion.div>

            {/* Rank #1 badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: 'spring' }}
              className="inline-block mb-6"
            >
              <div className="border-4 border-accent bg-black px-8 py-4">
                <span className="text-8xl font-bold text-accent led-glow">#1</span>
              </div>
            </motion.div>

            {/* Stock card - terminal style */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="border-2 border-primary bg-black p-6 max-w-md mx-auto"
            >
              {/* Stock image */}
              <motion.div
                animate={{
                  boxShadow: ['0 0 10px #ff9900', '0 0 30px #ff9900', '0 0 10px #ff9900']
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative w-32 h-32 mx-auto border-2 border-accent overflow-hidden mb-4"
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
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                    {stock.ticker.slice(0, 2)}
                  </div>
                )}
              </motion.div>

              {/* Stock info */}
              <h2 className="text-3xl font-bold text-primary mb-1">{stock.title}</h2>
              <p className="text-xl text-accent font-bold mb-4">{stock.ticker}</p>

              {/* Price display */}
              <div className="border-t border-b border-border py-4 my-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.3, type: 'spring' }}
                  className="text-4xl font-bold text-green-500 led-glow"
                >
                  {stock.price.toFixed(2)} <span className="text-2xl text-muted-foreground">CHF</span>
                </motion.div>
                <div className={`text-xl font-bold mt-2 ${stock.percent_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stock.percent_change >= 0 ? '▲' : '▼'} {stock.percent_change >= 0 ? '+' : ''}{stock.percent_change.toFixed(2)}%
                </div>
              </div>

              {/* Previous leader */}
              {event.metadata?.previousLeader && (
                <div className="text-sm text-muted-foreground">
                  <span className="text-red-500">▼</span> ÜBERHOLT: {event.metadata.previousLeader.ticker}
                </div>
              )}
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

        {/* Bottom ticker tape */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="bg-primary text-primary-foreground py-2 text-xl font-bold whitespace-nowrap overflow-hidden"
        >
          {tickerText.repeat(5)}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
