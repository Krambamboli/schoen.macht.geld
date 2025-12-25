'use client'

import { useEffects } from '@/contexts/effects-context'

export function DrunkMode() {
  const { isEffectEnabled } = useEffects()

  const isEnabled = isEffectEnabled('drunk')

  if (!isEnabled) return null

  return (
    <>
      <style jsx global>{`
        @keyframes drunk-wobble {
          0% {
            transform: rotate(-0.3deg) translateX(-1px);
          }
          25% {
            transform: rotate(0.2deg) translateX(0.5px) translateY(0.5px);
          }
          50% {
            transform: rotate(0.3deg) translateX(1px);
          }
          75% {
            transform: rotate(-0.2deg) translateX(-0.5px) translateY(-0.5px);
          }
          100% {
            transform: rotate(-0.3deg) translateX(-1px);
          }
        }

        @keyframes drunk-hue {
          0% {
            filter: blur(0.3px) hue-rotate(0deg);
          }
          50% {
            filter: blur(0.8px) hue-rotate(3deg);
          }
          100% {
            filter: blur(0.3px) hue-rotate(0deg);
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
        className="fixed inset-0 z-[5] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </>
  )
}