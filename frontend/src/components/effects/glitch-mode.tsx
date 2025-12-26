'use client';

import { useEffect, useState } from 'react';
import { useEffects } from '@/contexts/effects-context';

/**
 * Glitch/Static effect - VHS tracking errors and chromatic aberration
 * Creates random glitch lines and color separation
 */
export function GlitchMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects();
  const [glitchLine, setGlitchLine] = useState({ top: 0, height: 0, visible: false });

  const isEnabled = isEffectEnabled('glitch');
  const intensity = getEffectIntensity('glitch');

  // Calculate effect values based on intensity (0-100)
  const glitchChance = 0.3 + (intensity / 100) * 0.5; // 0.3 to 0.8
  const glitchLineHeight = 2 + (intensity / 100) * 30; // 2 to 32px
  const noiseOpacity = (intensity / 100) * 0.06; // 0 to 0.06
  const shakeAmount = (intensity / 100) * 4; // 0 to 4px
  const rgbShift = (intensity / 100) * 4; // 0 to 4px
  const intervalMin = 400 - (intensity / 100) * 300; // 400 to 100ms

  // Set CSS variables
  useEffect(() => {
    if (isEnabled) {
      document.body.style.setProperty('--glitch-shake', `${shakeAmount}px`);
      document.body.style.setProperty('--glitch-rgb', `${rgbShift}px`);
    }
    return () => {
      document.body.style.removeProperty('--glitch-shake');
      document.body.style.removeProperty('--glitch-rgb');
    };
  }, [isEnabled, shakeAmount, rgbShift]);

  // Random glitch line effect
  useEffect(() => {
    if (!isEnabled) return;

    const triggerGlitch = () => {
      // Random chance to show glitch
      if (Math.random() < glitchChance) {
        setGlitchLine({
          top: Math.random() * 100,
          height: 2 + Math.random() * glitchLineHeight,
          visible: true,
        });

        // Hide after short duration
        setTimeout(() => {
          setGlitchLine((prev) => ({ ...prev, visible: false }));
        }, 50 + Math.random() * 100);
      }
    };

    const interval = setInterval(triggerGlitch, intervalMin + Math.random() * 200);
    return () => clearInterval(interval);
  }, [isEnabled, glitchChance, glitchLineHeight, intervalMin]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Random glitch line - Bloomberg orange */}
      {glitchLine.visible && (
        <div
          className="fixed left-0 right-0 pointer-events-none z-[91]"
          style={{
            top: `${glitchLine.top}%`,
            height: `${glitchLine.height}px`,
            transform: `translateX(${(Math.random() - 0.5) * 20}px)`,
            backgroundColor: 'rgba(255, 153, 0, 0.3)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Static noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[90]"
        style={{
          opacity: noiseOpacity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          animation: 'glitch-noise 0.2s steps(10) infinite',
        }}
      />

      <style jsx global>{`
        @keyframes glitch-noise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2px, 2px); }
          20% { transform: translate(2px, -2px); }
          30% { transform: translate(-2px, -2px); }
          40% { transform: translate(2px, 2px); }
          50% { transform: translate(-2px, 2px); }
          60% { transform: translate(2px, -2px); }
          70% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 2px); }
          90% { transform: translate(-2px, 2px); }
        }

        body.effect-glitch {
          animation: glitch-shake 5s infinite;
        }

        @keyframes glitch-shake {
          0%, 95%, 100% { transform: translate(0, 0); }
          96% { transform: translate(calc(-1 * var(--glitch-shake, 2px)), 0); }
          97% { transform: translate(var(--glitch-shake, 2px), 0); }
          98% { transform: translate(calc(-0.5 * var(--glitch-shake, 1px)), 0); }
          99% { transform: translate(calc(0.5 * var(--glitch-shake, 1px)), 0); }
        }

        /* Chromatic aberration on text */
        body.effect-glitch *:not([data-effects-settings] *) {
          animation: glitch-chromatic 8s infinite;
        }

        @keyframes glitch-chromatic {
          0%, 90%, 100% {
            text-shadow: none;
          }
          91% {
            text-shadow:
              var(--glitch-rgb, 2px) 0 0 rgba(255, 153, 0, 0.7),
              calc(-1 * var(--glitch-rgb, 2px)) 0 0 rgba(255, 204, 0, 0.7);
          }
          92% {
            text-shadow:
              calc(-1 * var(--glitch-rgb, 2px)) 0 0 rgba(255, 153, 0, 0.7),
              var(--glitch-rgb, 2px) 0 0 rgba(255, 204, 0, 0.7);
          }
          93% {
            text-shadow: none;
          }
          94% {
            text-shadow:
              calc(0.5 * var(--glitch-rgb, 1px)) 0 0 rgba(255, 153, 0, 0.5),
              calc(-0.5 * var(--glitch-rgb, 1px)) 0 0 rgba(255, 204, 0, 0.5);
          }
        }
      `}</style>
    </>
  );
}
