'use client';

import { useEffects } from '@/contexts/effects-context';

/**
 * Aurora Waves effect - slow-moving color gradients in background
 * Creates a mesmerizing northern lights effect
 */
export function AuroraMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects();

  const isEnabled = isEffectEnabled('aurora');
  const intensity = getEffectIntensity('aurora');

  // Calculate effect values based on intensity (0-100)
  const wave1Opacity = 0.1 + (intensity / 100) * 0.4; // 0.1 to 0.5
  const wave2Opacity = 0.08 + (intensity / 100) * 0.35; // 0.08 to 0.43
  const wave3Opacity = 0.06 + (intensity / 100) * 0.3; // 0.06 to 0.36
  const blurAmount = 20 + (intensity / 100) * 40; // 20 to 60px

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[83] overflow-hidden">
        {/* Aurora wave 1 - Bloomberg orange */}
        <div
          className="absolute w-[200%] h-[50%]"
          style={{
            opacity: wave1Opacity,
            background: 'linear-gradient(180deg, transparent, rgba(255, 153, 0, 0.3), rgba(255, 204, 0, 0.3), transparent)',
            animation: 'aurora-wave1 15s ease-in-out infinite',
            filter: `blur(${blurAmount}px)`,
            top: '10%',
            left: '-50%',
          }}
        />
        {/* Aurora wave 2 - amber */}
        <div
          className="absolute w-[200%] h-[40%]"
          style={{
            opacity: wave2Opacity,
            background: 'linear-gradient(180deg, transparent, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.3), transparent)',
            animation: 'aurora-wave2 20s ease-in-out infinite',
            filter: `blur(${blurAmount * 1.25}px)`,
            top: '20%',
            left: '-50%',
          }}
        />
        {/* Aurora wave 3 - gold */}
        <div
          className="absolute w-[200%] h-[30%]"
          style={{
            opacity: wave3Opacity,
            background: 'linear-gradient(180deg, transparent, rgba(255, 204, 0, 0.4), rgba(255, 153, 0, 0.3), transparent)',
            animation: 'aurora-wave3 12s ease-in-out infinite',
            filter: `blur(${blurAmount * 0.75}px)`,
            top: '30%',
            left: '-50%',
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes aurora-wave1 {
          0%, 100% {
            transform: translateX(0) rotate(-5deg) scaleY(1);
          }
          50% {
            transform: translateX(20%) rotate(5deg) scaleY(1.2);
          }
        }

        @keyframes aurora-wave2 {
          0%, 100% {
            transform: translateX(10%) rotate(3deg) scaleY(1.1);
          }
          50% {
            transform: translateX(-10%) rotate(-3deg) scaleY(0.9);
          }
        }

        @keyframes aurora-wave3 {
          0%, 100% {
            transform: translateX(-5%) rotate(-2deg) scaleY(1);
          }
          33% {
            transform: translateX(15%) rotate(4deg) scaleY(1.3);
          }
          66% {
            transform: translateX(5%) rotate(-1deg) scaleY(0.8);
          }
        }
      `}</style>
    </>
  );
}
