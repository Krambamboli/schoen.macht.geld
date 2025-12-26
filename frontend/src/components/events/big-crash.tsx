'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, AlertTriangle, Flame } from 'lucide-react';
import type { StockEvent } from '@/contexts/events-context';
import { StockImage, StockTitle, COLORS } from '@/components/display';
import { TIMINGS } from '@/constants/timings';
import { EVENT_MESSAGES } from '@/constants/messages';

interface BigCrashProps {
  event: StockEvent;
  onComplete: () => void;
}

// Crash particle colors
const CRASH_COLORS = [COLORS.negative, '#f97316', '#fbbf24', '#dc2626'];

export function BigCrash({ event, onComplete }: BigCrashProps) {
  const [phase, setPhase] = useState<'impact' | 'shake' | 'burn' | 'exit'>('impact');
  const stock = event.stock;
  const crashPercent = event.metadata?.crashPercent ?? stock.percent_change;
  const duration = TIMINGS.eventBigCrash;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('shake'), 500),
      setTimeout(() => setPhase('burn'), 1500),
      setTimeout(() => setPhase('exit'), duration - 800),
      setTimeout(onComplete, duration),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  // Explosion particles
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    angle: (i / 40) * 360,
    distance: 100 + Math.random() * 200,
    size: 4 + Math.random() * 12,
    color: CRASH_COLORS[i % 4],
    delay: Math.random() * 0.3,
  }));

  // Smoke particles
  const smoke = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    x: -50 + Math.random() * 100,
    delay: 0.5 + Math.random() * 1,
    size: 40 + Math.random() * 60,
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
        onClick={onComplete}
      >
        {/* Screen shake effect on body */}
        {phase === 'shake' && (
          <style jsx global>{`
            body {
              animation: crash-shake 0.1s linear infinite;
            }
            @keyframes crash-shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px) translateY(5px); }
              50% { transform: translateX(10px) translateY(-5px); }
              75% { transform: translateX(-5px) translateY(10px); }
            }
          `}</style>
        )}

        {/* Red flash on impact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'impact' ? 0.8 : 0 }}
          transition={{ duration: 0.1 }}
          className="absolute inset-0 bg-red-600"
        />

        {/* Explosion particles */}
        {(phase === 'shake' || phase === 'burn') &&
          particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
                y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: 1,
                delay: particle.delay,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            />
          ))}

        {/* Smoke rising */}
        {phase === 'burn' &&
          smoke.map((s) => (
            <motion.div
              key={s.id}
              initial={{ y: 0, opacity: 0.6, scale: 0.5 }}
              animate={{ y: -300, opacity: 0, scale: 2 }}
              transition={{ duration: 3, delay: s.delay, ease: 'easeOut' }}
              className="absolute bottom-1/3 rounded-full bg-gray-600/50"
              style={{
                left: `calc(50% + ${s.x}px)`,
                width: s.size,
                height: s.size,
              }}
            />
          ))}

        {/* Main content */}
        <motion.div
          initial={{ scale: 2, opacity: 0 }}
          animate={{
            scale: phase === 'exit' ? 0.5 : 1,
            opacity: phase === 'exit' ? 0 : 1,
            y: phase === 'burn' ? [0, -5, 5, -3, 3, 0] : 0,
          }}
          transition={{
            scale: { type: 'spring', stiffness: 300, damping: 20 },
            y: { duration: 0.5, repeat: phase === 'burn' ? 2 : 0 },
          }}
          className="relative text-center z-10"
        >
          {/* Warning icons */}
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="flex justify-center gap-4 mb-4"
          >
            <AlertTriangle className="w-16 h-16 text-red-500" />
            <Flame className="w-16 h-16 text-orange-500" />
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </motion.div>

          {/* CRASH text */}
          <motion.h1
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-7xl font-bold mb-6 tracking-wider"
            style={{ color: COLORS.negative, textShadow: `0 0 40px ${COLORS.negative}80` }}
          >
            {EVENT_MESSAGES.crash.title}
          </motion.h1>

          {/* Stock card */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900/90 backdrop-blur rounded-2xl p-6 border-2 border-red-500/50 shadow-2xl shadow-red-500/30"
          >
            {/* Stock image with fire overlay */}
            <div className="relative w-28 h-28 mx-auto mb-4">
              <StockImage
                src={stock.image}
                alt={stock.title}
                ticker={stock.ticker}
                size="lg"
                rounded
                borderColor={COLORS.negative}
                fallbackBg="bg-gradient-to-br from-red-600 to-red-800"
                className="border-4"
              />
              {/* Fire overlay */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-gradient-to-t from-orange-500/60 to-transparent pointer-events-none"
              />
            </div>

            <StockTitle title={stock.title} size="2xl" truncate={false} className="font-bold text-white block mb-1" />
            <p className="text-red-400 font-mono mb-4">{stock.ticker}</p>

            {/* Crash percentage - big and scary */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="inline-flex items-center gap-2 text-5xl font-bold text-red-500 font-mono"
            >
              <TrendingDown className="w-12 h-12" />
              {crashPercent.toFixed(1)}%
            </motion.div>

            {/* Price info */}
            <div className="mt-4 text-gray-400">
              <p className="text-2xl font-mono text-white">{stock.price.toFixed(2)} CHF</p>
              {event.metadata?.previousPrice && (
                <p className="text-sm mt-1">
                  {EVENT_MESSAGES.crash.from} {event.metadata.previousPrice.toFixed(2)} CHF
                </p>
              )}
            </div>
          </motion.div>

          {/* Tap to dismiss */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 3 }}
            className="mt-8 text-sm text-gray-500"
          >
            {EVENT_MESSAGES.tapToDismissSimple}
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
