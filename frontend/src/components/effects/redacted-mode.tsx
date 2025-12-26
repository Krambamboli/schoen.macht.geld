'use client'

import { useEffect, useRef } from 'react'
import { useEffects } from '@/contexts/effects-context'

export function RedactedMode() {
  const { isEffectEnabled, getEffectIntensity, bootComplete } = useEffects()
  const redactedElementsRef = useRef<HTMLElement[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  const isEnabled = isEffectEnabled('redacted')
  const intensity = getEffectIntensity('redacted')

  // Calculate effect values based on intensity (0-100)
  const redactionPercent = 0.05 + (intensity / 100) * 0.25 // 5% to 30%
  const stampOpacity = 0.3 + (intensity / 100) * 0.7 // 0.3 to 1.0
  const chartBlur = (intensity / 100) * 10 // 0 to 10px

  useEffect(() => {
    if (!isEnabled || !bootComplete) {
      // Clean up redactions when disabled
      redactedElementsRef.current.forEach((el) => {
        el.removeAttribute('data-redacted')
      })
      redactedElementsRef.current = []
      return
    }

    const redactElements = () => {
      // Clear previous redactions
      redactedElementsRef.current.forEach((el) => {
        el.removeAttribute('data-redacted')
      })
      redactedElementsRef.current = []

      // Find text-containing elements (exclude settings panel and effects)
      const candidates = document.querySelectorAll(
        'td, span, p, h1, h2, h3, h4, div:not([class*="fixed"]):not([data-effects-settings])'
      )

      const validCandidates = Array.from(candidates).filter((el) => {
        // Skip if inside dialog or settings
        if (el.closest('[role="dialog"]') || el.closest('[data-effects-settings]')) {
          return false
        }
        // Skip if no direct text content
        const text = el.textContent?.trim() || ''
        if (text.length < 2 || text.length > 50) return false
        // Skip if has many children (not a leaf text node)
        if (el.children.length > 2) return false
        return true
      })

      // Randomly select elements to redact based on intensity
      const toRedact = validCandidates.filter(() => Math.random() < redactionPercent)

      toRedact.forEach((el) => {
        ;(el as HTMLElement).setAttribute('data-redacted', 'true')
        redactedElementsRef.current.push(el as HTMLElement)
      })
    }

    // Initial redaction
    redactElements()

    // Re-redact periodically (content might change)
    intervalRef.current = setInterval(redactElements, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      redactedElementsRef.current.forEach((el) => {
        el.removeAttribute('data-redacted')
      })
      redactedElementsRef.current = []
    }
  }, [isEnabled, bootComplete, redactionPercent])

  if (!isEnabled || !bootComplete) return null

  return (
    <>
      <style jsx global>{`
        /* Redact elements marked with data-redacted */
        [data-redacted="true"] {
          position: relative;
          color: transparent !important;
        }

        [data-redacted="true"]::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          height: 1.1em;
          background: #000;
          pointer-events: none;
        }

        /* Blur charts */
        body.redacted-mode .recharts-wrapper {
          filter: blur(${chartBlur}px);
        }
      `}</style>

      {/* Big centered REDACTED stamp */}
      <div
        className="fixed top-1/2 left-1/2 z-[100] pointer-events-none"
        style={{
          transform: 'translate(-50%, -50%) rotate(-15deg)',
          opacity: stampOpacity,
        }}
      >
        <div className="bg-red-600 text-white font-bold text-4xl md:text-6xl lg:text-8xl px-8 py-4 tracking-widest border-4 border-red-800 shadow-2xl">
          REDACTED
        </div>
      </div>

      {/* Corner classification stamps */}
      <div className="fixed top-4 left-4 z-[99] pointer-events-none" style={{ opacity: stampOpacity }}>
        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 tracking-wider">
          TOP SECRET
        </div>
      </div>
      <div className="fixed top-4 right-4 z-[99] pointer-events-none" style={{ opacity: stampOpacity }}>
        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 tracking-wider">
          EYES ONLY
        </div>
      </div>
      <div className="fixed bottom-4 left-4 z-[99] pointer-events-none" style={{ opacity: stampOpacity }}>
        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 tracking-wider">
          CLASSIFIED
        </div>
      </div>
      <div className="fixed bottom-4 right-16 z-[99] pointer-events-none" style={{ opacity: stampOpacity }}>
        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 tracking-wider">
          NO FORN
        </div>
      </div>
    </>
  )
}
