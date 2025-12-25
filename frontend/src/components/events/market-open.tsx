'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import type { StockEvent } from '@/contexts/events-context';

interface MarketOpenProps {
  event: StockEvent;
  onComplete: () => void;
}

const ANIMATION_DURATION = 5000; // 5 seconds

export function MarketOpen({ event, onComplete }: MarketOpenProps) {
  const [phase, setPhase] = useState<'flash' | 'bell' | 'text' | 'exit'>('flash');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('bell'), 300),
      setTimeout(() => setPhase('text'), 1500),
      setTimeout(() => setPhase('exit'), ANIMATION_DURATION - 800),
      setTimeout(onComplete, ANIMATION_DURATION),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Generate ring waves
  const ringWaves = Array.from({ length: 4 }).map((_, i) => ({
    id: i,
    delay: 0.5 + i * 0.3,
  }));

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
          className="absolute inset-0 bg-amber-400"
        />

        {/* Dark overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="absolute inset-0 bg-black"
        />

        {/* Radial glow behind bell */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.4 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute w-96 h-96 rounded-full bg-gradient-radial from-amber-500/60 via-amber-600/20 to-transparent"
        />

        {/* Ring waves emanating from bell */}
        {phase !== 'flash' &&
          ringWaves.map((wave) => (
            <motion.div
              key={wave.id}
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: wave.delay,
                repeat: 1,
                repeatDelay: 0.5,
              }}
              className="absolute w-32 h-32 rounded-full border-4 border-amber-400"
            />
          ))}

        {/* Bell container */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{
            scale: phase === 'exit' ? 0.8 : 1,
            rotate: 0,
            opacity: phase === 'exit' ? 0 : 1,
          }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Bell icon with ring animation */}
          <motion.div
            animate={
              phase === 'bell' || phase === 'text'
                ? {
                    rotate: [0, 15, -15, 12, -12, 8, -8, 0],
                  }
                : {}
            }
            transition={{
              duration: 0.8,
              repeat: 2,
              repeatDelay: 0.3,
            }}
            className="relative"
          >
            {/* Glow effect */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 30px rgba(251, 191, 36, 0.5)',
                  '0 0 60px rgba(251, 191, 36, 0.8)',
                  '0 0 30px rgba(251, 191, 36, 0.5)',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
            />
            <Bell
              className="w-32 h-32 text-amber-400 drop-shadow-2xl"
              strokeWidth={1.5}
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase === 'text' || phase === 'bell' ? 1 : 0,
              y: phase === 'text' || phase === 'bell' ? 0 : 20,
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <motion.h1
              className="text-5xl font-bold text-amber-400 tracking-wider"
              style={{ textShadow: '0 0 30px rgba(251, 191, 36, 0.6)' }}
            >
              MARKT GEÖFFNET
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 text-xl text-amber-200/80"
            >
              Die Börse ist eröffnet!
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Tap to dismiss */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-12 text-sm text-gray-500"
        >
          Tippen zum Schliessen
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}