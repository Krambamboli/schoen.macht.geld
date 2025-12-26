'use client';

import { useEffect } from 'react';
import { useEffects } from '@/contexts/effects-context';

/**
 * CRT Scanlines effect - adds retro CRT monitor aesthetics
 * Includes horizontal scanlines, slight screen curvature, and subtle flicker
 */
export function CrtMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects();

  const isEnabled = isEffectEnabled('crt');
  const intensity = getEffectIntensity('crt');

  // Calculate effect values based on intensity (0-100)
  const scanlineOpacity = (intensity / 100) * 0.3; // 0 to 0.3
  const vignetteOpacity = (intensity / 100) * 0.5; // 0 to 0.5
  const rgbShift = (intensity / 100) * 1; // 0 to 1px
  const flickerAmount = 1 - (intensity / 100) * 0.04; // 1 to 0.96

  // Set CSS variables
  useEffect(() => {
    if (isEnabled) {
      document.body.style.setProperty('--crt-rgb-shift', `${rgbShift}px`);
      document.body.style.setProperty('--crt-flicker', String(flickerAmount));
    }
    return () => {
      document.body.style.removeProperty('--crt-rgb-shift');
      document.body.style.removeProperty('--crt-flicker');
    };
  }, [isEnabled, rgbShift, flickerAmount]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[90]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, ${scanlineOpacity}) 0px,
            rgba(0, 0, 0, ${scanlineOpacity}) 1px,
            transparent 1px,
            transparent 2px
          )`,
        }}
      />
      {/* Screen curvature vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[89]"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, ${vignetteOpacity}) 100%
          )`,
        }}
      />
      {/* Subtle RGB shift on edges */}
      <style jsx global>{`
        body.effect-crt > *:not([data-effects-settings]) {
          text-shadow:
            var(--crt-rgb-shift, 0.5px) 0 0 rgba(255, 0, 0, 0.3),
            calc(-1 * var(--crt-rgb-shift, 0.5px)) 0 0 rgba(0, 255, 255, 0.3);
        }
        body.effect-crt {
          animation: crt-flicker 0.15s infinite;
        }
        @keyframes crt-flicker {
          0% { opacity: 1; }
          50% { opacity: var(--crt-flicker, 0.98); }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
