'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useEffects } from '@/contexts/effects-context'

export function BeatSyncMode() {
  const { isEffectEnabled, getEffectIntensity, beatState, setBeatState } = useEffects()
  const isEnabled = isEffectEnabled('beatSync')
  const intensity = getEffectIntensity('beatSync')

  // Calculate effect values based on intensity (0-100)
  const scaleAmount = 1 + (intensity / 100) * 0.08 // 1.0 to 1.08
  const rotateAmount = (intensity / 100) * 2 // 0 to 2 degrees
  const vignetteOpacity = (intensity / 100) * 0.25 // 0 to 0.25
  const flashOpacity = (intensity / 100) * 0.15 // 0 to 0.15
  const chromaticOffset = (intensity / 100) * 4 // 0 to 4px
  const scanlinesOpacity = (intensity / 100) * 0.3 // 0 to 0.3
  const cardScale = 1 + (intensity / 100) * 0.05 // 1.0 to 1.05
  const glowIntensity = (intensity / 100) * 20 // 0 to 20px blur
  const priceGlow = (intensity / 100) * 8 // 0 to 8px

  const [pulse, setPulse] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyzerRef = useRef<any>(null)
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startPulseLoop = useCallback((bpm: number) => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current)
    }

    const beatInterval = 60000 / bpm

    const triggerPulse = () => {
      setPulse(true)
      setTimeout(() => setPulse(false), Math.min(beatInterval * 0.25, 120))
    }

    triggerPulse()
    pulseIntervalRef.current = setInterval(triggerPulse, beatInterval)
  }, [])

  const stopPulseLoop = useCallback(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current)
      pulseIntervalRef.current = null
    }
    setPulse(false)
  }, [])

  const startListening = useCallback(async () => {
    try {
      setBeatState({ bpm: 0, status: 'requesting', confidence: 0 })

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Create microphone source
      const microphone = audioContext.createMediaStreamSource(stream)

      // Import and create the analyzer
      const { createRealTimeBpmProcessor } = await import('realtime-bpm-analyzer')
      const analyzer = await createRealTimeBpmProcessor(audioContext, {
        continuousAnalysis: true,
        stabilizationTime: 10000, // 10 seconds for stable BPM
      })
      analyzerRef.current = analyzer

      // Connect microphone to analyzer's AudioWorkletNode via .node property
      microphone.connect(analyzer.node)

      setBeatState({ bpm: 0, status: 'listening', confidence: 0 })

      // Listen for BPM updates using event emitter API
      // Track previous BPM to avoid redundant pulse loop restarts
      let lastBpm = 0
      let lastStatus: string = 'idle'

      analyzer.on('bpm', (data) => {
        if (data.bpm && data.bpm.length > 0) {
          const topCandidate = data.bpm[0]
          const bpm = Math.round(topCandidate.tempo)
          const confidence = topCandidate.count / 100

          // Start pulse loop outside of setState to avoid nested state updates
          if (lastStatus !== 'synced' || Math.abs(lastBpm - bpm) > 2) {
            startPulseLoop(bpm)
          }
          lastBpm = bpm
          lastStatus = 'synced'

          setBeatState({
            bpm,
            status: 'synced',
            confidence: Math.min(confidence, 1),
          })
        }
      })

      analyzer.on('bpmStable', (data) => {
        if (data.bpm && data.bpm.length > 0) {
          const bpm = Math.round(data.bpm[0].tempo)
          setBeatState((prev) => ({
            ...prev,
            bpm,
            confidence: 1,
          }))
          startPulseLoop(bpm)
        }
      })
    } catch (error) {
      console.error('Beat sync error:', error)
      setBeatState({
        bpm: 0,
        status: 'error',
        confidence: 0,
        errorMessage:
          error instanceof Error ? error.message : 'Failed to access microphone',
      })
    }
  }, [startPulseLoop, setBeatState])

  const stopListening = useCallback(() => {
    stopPulseLoop()

    if (analyzerRef.current) {
      analyzerRef.current.stop()
      analyzerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setBeatState({ bpm: 0, status: 'idle', confidence: 0 })
  }, [stopPulseLoop, setBeatState])

  // Start/stop based on effect enabled state
  useEffect(() => {
    if (isEnabled) {
      startListening()
    } else {
      stopListening()
    }

    return () => {
      stopListening()
    }
  }, [isEnabled, startListening, stopListening])

  // Apply body class and CSS variables for pulse effect
  useEffect(() => {
    const body = document.body
    if (isEnabled) {
      body.classList.add('effect-beatSync')
      body.style.setProperty('--beat-scale', String(scaleAmount))
      body.style.setProperty('--beat-rotate', `${rotateAmount}deg`)
      body.style.setProperty('--beat-vignette', String(vignetteOpacity))
      body.style.setProperty('--beat-flash', String(flashOpacity))
      body.style.setProperty('--beat-chromatic', `${chromaticOffset}px`)
      body.style.setProperty('--beat-scanlines', String(scanlinesOpacity))
      body.style.setProperty('--beat-card-scale', String(cardScale))
      body.style.setProperty('--beat-glow', `${glowIntensity}px`)
      body.style.setProperty('--beat-price-glow', `${priceGlow}px`)
    } else {
      body.classList.remove('effect-beatSync')
      body.style.removeProperty('--beat-scale')
      body.style.removeProperty('--beat-rotate')
      body.style.removeProperty('--beat-vignette')
      body.style.removeProperty('--beat-flash')
      body.style.removeProperty('--beat-chromatic')
      body.style.removeProperty('--beat-scanlines')
      body.style.removeProperty('--beat-card-scale')
      body.style.removeProperty('--beat-glow')
      body.style.removeProperty('--beat-price-glow')
    }

    return () => {
      body.classList.remove('effect-beatSync')
      body.style.removeProperty('--beat-scale')
      body.style.removeProperty('--beat-rotate')
      body.style.removeProperty('--beat-vignette')
      body.style.removeProperty('--beat-flash')
      body.style.removeProperty('--beat-chromatic')
      body.style.removeProperty('--beat-scanlines')
      body.style.removeProperty('--beat-card-scale')
      body.style.removeProperty('--beat-glow')
      body.style.removeProperty('--beat-price-glow')
    }
  }, [isEnabled, scaleAmount, rotateAmount, vignetteOpacity, flashOpacity, chromaticOffset, scanlinesOpacity, cardScale, glowIntensity, priceGlow])

  // Apply pulse class
  useEffect(() => {
    const body = document.body
    if (pulse) {
      body.classList.add('beat-pulse')
    } else {
      body.classList.remove('beat-pulse')
    }
  }, [pulse])

  if (!isEnabled) return null

  return (
    <>
      <div className="beat-scanlines-overlay" />
      <style jsx global>{`
      body.effect-beatSync {
        overflow: hidden;
      }

      body.effect-beatSync > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
        transform-origin: center center;
        transition: transform 0.08s ease-out;
        will-change: transform;
        backface-visibility: hidden;
      }

      body.effect-beatSync.beat-pulse > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
        transform: scale(var(--beat-scale, 1.012)) rotate(var(--beat-rotate, 0.3deg));
      }

      /* Vignette pulse effect */
      body.effect-beatSync::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9988;
        background: radial-gradient(
          ellipse at center,
          transparent 50%,
          rgba(0, 0, 0, 0) 100%
        );
        transition: opacity 0.08s ease-out;
        will-change: opacity;
        backface-visibility: hidden;
        opacity: 0;
      }

      body.effect-beatSync.beat-pulse::after {
        opacity: 1;
        background: radial-gradient(
          ellipse at center,
          transparent 40%,
          rgba(255, 153, 0, var(--beat-vignette, 0.08)) 100%
        );
      }

      /* Flash/Strobe effect overlay */
      body.effect-beatSync::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9987;
        opacity: 0;
        background: rgba(255, 153, 0, var(--beat-flash, 0.1));
        transition: opacity 0.05s ease-out;
        will-change: opacity;
        backface-visibility: hidden;
      }

      body.effect-beatSync.beat-pulse::before {
        opacity: 1;
      }

      /* Scanlines pulse effect */
      body.effect-beatSync .beat-scanlines-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9986;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, var(--beat-scanlines, 0.2)) 2px,
          rgba(0, 0, 0, var(--beat-scanlines, 0.2)) 4px
        );
        opacity: 0;
        transition: opacity 0.08s ease-out;
        will-change: opacity;
        backface-visibility: hidden;
      }

      body.effect-beatSync.beat-pulse .beat-scanlines-overlay {
        opacity: 1;
      }

      /* Chromatic aberration effect */
      body.effect-beatSync.beat-pulse main {
        text-shadow:
          calc(-1 * var(--beat-chromatic, 2px)) 0 rgba(255, 0, 0, 0.3),
          var(--beat-chromatic, 2px) 0 rgba(0, 255, 255, 0.3);
      }

      /* Stock cards bounce effect */
      body.effect-beatSync [data-stock-card] {
        transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        will-change: transform;
        backface-visibility: hidden;
      }

      body.effect-beatSync.beat-pulse [data-stock-card] {
        transform: scale(var(--beat-card-scale, 1.03));
        box-shadow: 0 0 var(--beat-glow, 15px) rgba(255, 153, 0, 0.4);
      }

      /* Chart line glow effect */
      body.effect-beatSync .recharts-line path,
      body.effect-beatSync .recharts-area path,
      body.effect-beatSync [data-chart-line] {
        transition: filter 0.08s ease-out;
        will-change: filter;
      }

      body.effect-beatSync.beat-pulse .recharts-line path,
      body.effect-beatSync.beat-pulse .recharts-area path,
      body.effect-beatSync.beat-pulse [data-chart-line] {
        filter: drop-shadow(0 0 var(--beat-glow, 10px) rgba(255, 153, 0, 0.6));
      }

      /* Price flash effect */
      body.effect-beatSync [data-price],
      body.effect-beatSync [data-percent-change] {
        transition: text-shadow 0.08s ease-out, transform 0.08s ease-out;
        will-change: transform;
        backface-visibility: hidden;
      }

      body.effect-beatSync.beat-pulse [data-price],
      body.effect-beatSync.beat-pulse [data-percent-change] {
        text-shadow: 0 0 var(--beat-price-glow, 6px) currentColor;
        transform: scale(1.05);
      }

      /* Ensure dialogs are not affected */
      [data-radix-popper-content-wrapper],
      [data-radix-popper-content-wrapper] *,
      [role="dialog"],
      [role="dialog"] *,
      [data-effects-settings] {
        transform: none !important;
        text-shadow: none !important;
      }
    `}</style>
    </>
  )
}
