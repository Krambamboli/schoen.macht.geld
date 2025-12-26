'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon } from 'lucide-react';
import type { StockEvent } from '@/contexts/events-context';
import { TIMINGS } from '@/constants/timings';
import { EVENT_MESSAGES } from '@/constants/messages';
import { StockTitle } from '@/components/display/StockTitle';
import { PercentChange } from '@/components/display/PercentChange';
import { StockImage } from '@/components/display/StockImage';

interface MarketCloseProps {
  event: StockEvent;
  onComplete: () => void;
}

export function MarketClose({ event, onComplete }: MarketCloseProps) {
  const [phase, setPhase] = useState<'flash' | 'moon' | 'text' | 'exit'>('flash');
  const marketDay = event.metadata?.marketDay ?? 1;
  const topMover = event.stock;
  const duration = TIMINGS.eventMarketClose;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('moon'), 300),
      setTimeout(() => setPhase('text'), 1500),
      setTimeout(() => setPhase('exit'), duration - 800),
      setTimeout(onComplete, duration),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        onClick={onComplete}
      >
        {/* Initial flash */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute inset-0 bg-slate-800"
        />

        {/* Dark overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.95 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="absolute inset-0 bg-black"
        />

        {/* Stars background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(2px 2px at 20px 30px, white, transparent),
              radial-gradient(2px 2px at 40px 70px, white, transparent),
              radial-gradient(1px 1px at 90px 40px, white, transparent),
              radial-gradient(2px 2px at 160px 120px, white, transparent),
              radial-gradient(1px 1px at 230px 80px, white, transparent),
              radial-gradient(2px 2px at 300px 150px, white, transparent),
              radial-gradient(1px 1px at 400px 60px, white, transparent),
              radial-gradient(2px 2px at 500px 200px, white, transparent)`,
            backgroundSize: '550px 250px',
          }}
        />

        {/* Radial glow behind moon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.3 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute w-96 h-96 rounded-full bg-gradient-radial from-slate-500/40 via-slate-600/10 to-transparent"
        />

        {/* Moon container */}
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{
            scale: phase === 'exit' ? 0.8 : 1,
            y: 0,
            opacity: phase === 'exit' ? 0 : 1,
          }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Moon icon with glow */}
          <motion.div
            animate={{
              filter: [
                'drop-shadow(0 0 20px rgba(148, 163, 184, 0.5))',
                'drop-shadow(0 0 40px rgba(148, 163, 184, 0.7))',
                'drop-shadow(0 0 20px rgba(148, 163, 184, 0.5))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Moon
              className="w-32 h-32 text-slate-300"
              strokeWidth={1.5}
              fill="currentColor"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase === 'text' || phase === 'moon' ? 1 : 0,
              y: phase === 'text' || phase === 'moon' ? 0 : 20,
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <motion.h1
              className="text-5xl font-bold text-slate-300 tracking-wider drop-shadow-[0_0_30px_rgba(148,163,184,0.6)]"
            >
              {EVENT_MESSAGES.market.closed}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 text-xl text-slate-200/80"
            >
              {EVENT_MESSAGES.market.tradingDay} {marketDay} {EVENT_MESSAGES.market.dayEnded}
            </motion.p>
            {topMover && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 flex flex-col items-center gap-3"
              >
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  {EVENT_MESSAGES.market.dayWinner}
                </span>
                <StockImage
                  src={topMover.image}
                  alt={topMover.title}
                  ticker={topMover.ticker}
                  size="lg"
                  className="border-slate-300"
                />
                <div className="flex flex-col items-center gap-1">
                  <StockTitle
                    title={topMover.title}
                    size="xl"
                    truncate={false}
                    className="text-slate-200"
                  />
                  <PercentChange
                    value={topMover.percent_change ?? 0}
                    size="xl"
                    showSign
                    showArrow
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Tap to dismiss */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-12 text-sm text-gray-500"
        >
          {EVENT_MESSAGES.tapToDismissSimple}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}