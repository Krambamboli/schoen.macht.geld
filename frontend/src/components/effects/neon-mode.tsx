'use client';

import { useEffect } from 'react';
import { useEffects } from '@/contexts/effects-context';

/**
 * Neon Glow effect - adds cyberpunk-style glowing edges
 * Makes UI elements glow with neon colors
 */
export function NeonMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects();

  const isEnabled = isEffectEnabled('neon');
  const intensity = getEffectIntensity('neon');

  // Calculate effect values based on intensity (0-100)
  const glowMultiplier = intensity / 100; // 0 to 1
  const blur1 = 5 * glowMultiplier;
  const blur2 = 10 * glowMultiplier;
  const blur3 = 20 * glowMultiplier;
  const blur4 = 40 * glowMultiplier;

  // Set CSS variables
  useEffect(() => {
    if (isEnabled) {
      document.body.style.setProperty('--neon-blur-1', `${blur1}px`);
      document.body.style.setProperty('--neon-blur-2', `${blur2}px`);
      document.body.style.setProperty('--neon-blur-3', `${blur3}px`);
      document.body.style.setProperty('--neon-blur-4', `${blur4}px`);
      document.body.style.setProperty('--neon-opacity', String(glowMultiplier));
    }
    return () => {
      document.body.style.removeProperty('--neon-blur-1');
      document.body.style.removeProperty('--neon-blur-2');
      document.body.style.removeProperty('--neon-blur-3');
      document.body.style.removeProperty('--neon-blur-4');
      document.body.style.removeProperty('--neon-opacity');
    };
  }, [isEnabled, blur1, blur2, blur3, blur4, glowMultiplier]);

  if (!isEnabled) {
    return null;
  }

  return (
    <style jsx global>{`
      body.effect-neon {
        --neon-orange: #ff9900;
        --neon-gold: #ffcc00;
        --neon-amber: #f59e0b;
      }

      body.effect-neon *:not([data-effects-settings] *) {
        transition: text-shadow 0.3s, box-shadow 0.3s;
      }

      /* Glow on text - Bloomberg orange */
      body.effect-neon h1,
      body.effect-neon h2,
      body.effect-neon h3 {
        text-shadow:
          0 0 var(--neon-blur-1, 5px) var(--neon-orange),
          0 0 var(--neon-blur-2, 10px) var(--neon-orange),
          0 0 var(--neon-blur-3, 20px) var(--neon-orange),
          0 0 var(--neon-blur-4, 40px) var(--neon-orange);
      }

      /* Glow on buttons - gold accent */
      body.effect-neon button:not([data-effects-settings] button),
      body.effect-neon [role="button"]:not([data-effects-settings] *) {
        box-shadow:
          0 0 var(--neon-blur-1, 5px) var(--neon-gold),
          0 0 var(--neon-blur-2, 10px) var(--neon-gold),
          inset 0 0 var(--neon-blur-1, 5px) rgba(255, 204, 0, calc(0.1 * var(--neon-opacity, 1)));
        border-color: var(--neon-gold) !important;
      }

      /* Glow on cards - orange */
      body.effect-neon [class*="card"]:not([data-effects-settings] *),
      body.effect-neon [class*="Card"]:not([data-effects-settings] *) {
        box-shadow:
          0 0 var(--neon-blur-2, 10px) rgba(255, 153, 0, calc(0.3 * var(--neon-opacity, 1))),
          0 0 var(--neon-blur-3, 20px) rgba(255, 153, 0, calc(0.2 * var(--neon-opacity, 1))),
          inset 0 0 var(--neon-blur-2, 10px) rgba(255, 153, 0, calc(0.05 * var(--neon-opacity, 1)));
        border-color: var(--neon-orange) !important;
      }

      /* Glow on tables - gold */
      body.effect-neon table {
        box-shadow: 0 0 var(--neon-blur-3, 20px) rgba(255, 204, 0, calc(0.2 * var(--neon-opacity, 1)));
      }

      body.effect-neon th {
        text-shadow: 0 0 var(--neon-blur-2, 10px) var(--neon-gold);
      }

      /* Animated border glow - Bloomberg colors */
      body.effect-neon::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 88;
        border: 2px solid transparent;
        animation: neon-border 4s linear infinite;
        box-shadow:
          inset 0 0 var(--neon-blur-3, 20px) rgba(255, 153, 0, calc(0.1 * var(--neon-opacity, 1))),
          inset 0 0 var(--neon-blur-4, 40px) rgba(255, 204, 0, calc(0.1 * var(--neon-opacity, 1)));
      }

      @keyframes neon-border {
        0%, 100% {
          border-color: var(--neon-orange);
          box-shadow:
            inset 0 0 var(--neon-blur-3, 20px) rgba(255, 153, 0, calc(0.2 * var(--neon-opacity, 1))),
            0 0 var(--neon-blur-3, 20px) rgba(255, 153, 0, calc(0.3 * var(--neon-opacity, 1)));
        }
        33% {
          border-color: var(--neon-gold);
          box-shadow:
            inset 0 0 var(--neon-blur-3, 20px) rgba(255, 204, 0, calc(0.2 * var(--neon-opacity, 1))),
            0 0 var(--neon-blur-3, 20px) rgba(255, 204, 0, calc(0.3 * var(--neon-opacity, 1)));
        }
        66% {
          border-color: var(--neon-amber);
          box-shadow:
            inset 0 0 var(--neon-blur-3, 20px) rgba(245, 158, 11, calc(0.2 * var(--neon-opacity, 1))),
            0 0 var(--neon-blur-3, 20px) rgba(245, 158, 11, calc(0.3 * var(--neon-opacity, 1)));
        }
      }
    `}</style>
  );
}
