'use client'

import { useEffect } from 'react'
import { useEffects } from '@/contexts/effects-context'

export function DrunkMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects()

  const isEnabled = isEffectEnabled('drunk')
  const intensity = getEffectIntensity('drunk')

  // Calculate effect values based on intensity (0-100)
  const wobbleAmount = (intensity / 100) * 0.6 // 0 to 0.6 degrees
  const translateAmount = (intensity / 100) * 2 // 0 to 2px
  const blurMin = (intensity / 100) * 0.6 // 0 to 0.6px
  const blurMax = (intensity / 100) * 1.6 // 0 to 1.6px
  const hueRotate = (intensity / 100) * 6 // 0 to 6 degrees
  const vignetteOpacity = (intensity / 100) * 0.4 // 0 to 0.4

  // Set CSS variables on body
  useEffect(() => {
    if (isEnabled) {
      document.body.style.setProperty('--drunk-wobble', `${wobbleAmount}deg`)
      document.body.style.setProperty('--drunk-translate', `${translateAmount}px`)
      document.body.style.setProperty('--drunk-blur-min', `${blurMin}px`)
      document.body.style.setProperty('--drunk-blur-max', `${blurMax}px`)
      document.body.style.setProperty('--drunk-hue', `${hueRotate}deg`)
    }
    return () => {
      document.body.style.removeProperty('--drunk-wobble')
      document.body.style.removeProperty('--drunk-translate')
      document.body.style.removeProperty('--drunk-blur-min')
      document.body.style.removeProperty('--drunk-blur-max')
      document.body.style.removeProperty('--drunk-hue')
    }
  }, [isEnabled, wobbleAmount, translateAmount, blurMin, blurMax, hueRotate])

  if (!isEnabled) return null

  return (
    <>
      <style jsx global>{`
        @keyframes drunk-wobble {
          0% {
            transform: rotate(calc(-1 * var(--drunk-wobble, 0.3deg))) translateX(calc(-1 * var(--drunk-translate, 1px)));
          }
          25% {
            transform: rotate(calc(0.66 * var(--drunk-wobble, 0.2deg))) translateX(calc(0.5 * var(--drunk-translate, 0.5px))) translateY(calc(0.5 * var(--drunk-translate, 0.5px)));
          }
          50% {
            transform: rotate(var(--drunk-wobble, 0.3deg)) translateX(var(--drunk-translate, 1px));
          }
          75% {
            transform: rotate(calc(-0.66 * var(--drunk-wobble, 0.2deg))) translateX(calc(-0.5 * var(--drunk-translate, 0.5px))) translateY(calc(-0.5 * var(--drunk-translate, 0.5px)));
          }
          100% {
            transform: rotate(calc(-1 * var(--drunk-wobble, 0.3deg))) translateX(calc(-1 * var(--drunk-translate, 1px)));
          }
        }

        @keyframes drunk-hue {
          0% {
            filter: blur(var(--drunk-blur-min, 0.3px)) hue-rotate(0deg);
          }
          50% {
            filter: blur(var(--drunk-blur-max, 0.8px)) hue-rotate(var(--drunk-hue, 3deg));
          }
          100% {
            filter: blur(var(--drunk-blur-min, 0.3px)) hue-rotate(0deg);
          }
        }

        /* Only affect main content, not dialogs/sheets */
        body.drunk-mode > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]) {
          animation: drunk-wobble 4s ease-in-out infinite;
        }

        /* Apply blur only to main content areas, exclude dialogs */
        body.drunk-mode main,
        body.drunk-mode [data-main-content],
        body.drunk-mode > div:first-child:not([data-radix-popper-content-wrapper]) {
          animation: drunk-hue 5s ease-in-out infinite;
        }

        /* Ensure Radix dialogs and settings button are NOT affected */
        [data-radix-popper-content-wrapper],
        [data-radix-popper-content-wrapper] *,
        [role="dialog"],
        [role="dialog"] *,
        [data-effects-settings] {
          animation: none !important;
          filter: none !important;
          transform: none !important;
        }
      `}</style>
      {/* Vignette overlay */}
      <div
        className="fixed inset-0 z-[5] pointer-events-none"
        style={{
          opacity: vignetteOpacity,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </>
  )
}