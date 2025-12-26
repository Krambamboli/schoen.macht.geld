'use client';

import { useEffect, useRef } from 'react';
import { useEffects } from '@/contexts/effects-context';

/**
 * Binary Rain effect - subtle 0s and 1s floating in margins
 * Lighter version of matrix rain, only on edges
 */
export function BinaryMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isEnabled = isEffectEnabled('binary');
  const intensity = getEffectIntensity('binary');

  // Calculate effect values based on intensity (0-100)
  const canvasOpacity = 0.2 + (intensity / 100) * 0.6; // 0.2 to 0.8
  const fallSpeed = 0.2 + (intensity / 100) * 0.6; // 0.2 to 0.8
  const colorOpacity = 0.2 + (intensity / 100) * 0.4; // 0.2 to 0.6

  useEffect(() => {
    if (!isEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Binary digits
    const chars = ['0', '1'];
    const fontSize = 14;

    // State for animation
    let marginWidth = Math.min(200, window.innerWidth * 0.15); // 15% of screen width, max 200px
    let leftColumns = Math.floor(marginWidth / fontSize);
    let rightColumns = Math.floor(marginWidth / fontSize);
    let totalColumns = leftColumns + rightColumns;
    let drops: number[] = Array(totalColumns).fill(0).map(() => Math.random() * -50);

    // Set canvas size and recalculate columns
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      marginWidth = Math.min(200, window.innerWidth * 0.15);
      leftColumns = Math.floor(marginWidth / fontSize);
      rightColumns = Math.floor(marginWidth / fontSize);
      const newTotal = leftColumns + rightColumns;
      if (newTotal !== totalColumns) {
        totalColumns = newTotal;
        drops = Array(totalColumns).fill(0).map(() => Math.random() * -50);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(255, 153, 0, ${colorOpacity})`;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < totalColumns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];

        // Calculate x position (left or right margin)
        let x: number;
        if (i < leftColumns) {
          x = i * fontSize;
        } else {
          x = canvas.width - marginWidth + (i - leftColumns) * fontSize;
        }

        const y = drops[i] * fontSize;

        ctx.fillText(char, x, y);

        // Reset drop randomly or when it goes off screen
        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i] += fallSpeed;
      }
    };

    const interval = setInterval(draw, 80); // Slower refresh

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [isEnabled, fallSpeed, colorOpacity]);

  if (!isEnabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[84]"
      style={{ opacity: canvasOpacity }}
    />
  );
}
