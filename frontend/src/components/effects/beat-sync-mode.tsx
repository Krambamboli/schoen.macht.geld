'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useEffects } from '@/contexts/effects-context'

type AnalyzerStatus = 'idle' | 'requesting' | 'listening' | 'synced' | 'error'

interface BeatState {
  bpm: number
  status: AnalyzerStatus
  confidence: number
  errorMessage?: string
}

export function BeatSyncMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects()
  const isEnabled = isEffectEnabled('beatSync')
  const intensity = getEffectIntensity('beatSync')

  // Calculate effect values based on intensity (0-100)
  const scaleAmount = 1 + (intensity / 100) * 0.08 // 1.0 to 1.08
  const rotateAmount = (intensity / 100) * 2 // 0 to 2 degrees
  const translateAmount = (intensity / 100) * 12 // 0 to 12px
  const vignetteOpacity = (intensity / 100) * 0.25 // 0 to 0.25

  const [beatState, setBeatState] = useState<BeatState>({
    bpm: 0,
    status: 'idle',
    confidence: 0,
  })

  const [pulse, setPulse] = useState(false)
  const [translateDir, setTranslateDir] = useState({ x: 0, y: 0 })

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
      // Random direction for translation
      setTranslateDir({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      })
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
      analyzer.on('bpm', (data) => {
        if (data.bpm && data.bpm.length > 0) {
          const topCandidate = data.bpm[0]
          const bpm = Math.round(topCandidate.tempo)
          const confidence = topCandidate.count / 100

          setBeatState((prev) => {
            if (prev.status !== 'synced' || Math.abs(prev.bpm - bpm) > 2) {
              startPulseLoop(bpm)
            }
            return {
              bpm,
              status: 'synced',
              confidence: Math.min(confidence, 1),
            }
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
  }, [startPulseLoop])

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
  }, [stopPulseLoop])

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
      body.style.setProperty('--beat-translate-x', `${translateDir.x * translateAmount}px`)
      body.style.setProperty('--beat-translate-y', `${translateDir.y * translateAmount}px`)
      body.style.setProperty('--beat-vignette', String(vignetteOpacity))
    } else {
      body.classList.remove('effect-beatSync')
      body.style.removeProperty('--beat-scale')
      body.style.removeProperty('--beat-rotate')
      body.style.removeProperty('--beat-translate-x')
      body.style.removeProperty('--beat-translate-y')
      body.style.removeProperty('--beat-vignette')
    }

    return () => {
      body.classList.remove('effect-beatSync')
      body.style.removeProperty('--beat-scale')
      body.style.removeProperty('--beat-rotate')
      body.style.removeProperty('--beat-translate-x')
      body.style.removeProperty('--beat-translate-y')
      body.style.removeProperty('--beat-vignette')
    }
  }, [isEnabled, scaleAmount, rotateAmount, translateAmount, translateDir, vignetteOpacity])

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
      <style jsx global>{`
        body.effect-beatSync {
          overflow: hidden;
        }

        body.effect-beatSync > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
          transform-origin: center center;
          transition: transform 0.08s ease-out;
        }

        body.effect-beatSync.beat-pulse > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
          transform: scale(var(--beat-scale, 1.012)) rotate(var(--beat-rotate, 0.3deg)) translate(var(--beat-translate-x, 0px), var(--beat-translate-y, 0px));
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
          transition: background 0.08s ease-out;
        }

        body.effect-beatSync.beat-pulse::after {
          background: radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(255, 153, 0, var(--beat-vignette, 0.08)) 100%
          );
        }

        /* Ensure dialogs are not affected */
        [data-radix-popper-content-wrapper],
        [data-radix-popper-content-wrapper] *,
        [role="dialog"],
        [role="dialog"] *,
        [data-effects-settings] {
          transform: none !important;
        }
      `}</style>

      {/* BPM indicator widget - shows all statuses - Bloomberg style */}
      {beatState.status !== 'idle' && (
        <div
          className={`fixed bottom-20 right-4 z-[9989] px-3 py-2 bg-black border transition-all duration-75 ${
            beatState.status === 'synced' && pulse
              ? 'border-accent scale-110'
              : beatState.status === 'error'
                ? 'border-red-500'
                : beatState.status === 'listening'
                  ? 'border-primary'
                  : 'border-border'
          }`}
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wide">BPM</div>

          {beatState.status === 'requesting' && (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-border border-t-primary" />
              <span className="text-sm text-muted-foreground">MIC...</span>
            </div>
          )}

          {beatState.status === 'listening' && (
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-primary animate-pulse"
                  style={{
                    height: `${8 + (i % 2) * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}

          {beatState.status === 'synced' && (
            <div className="text-3xl font-bold font-mono tabular-nums text-accent led-glow">
              {beatState.bpm}
            </div>
          )}

          {beatState.status === 'error' && (
            <button
              onClick={startListening}
              className="text-sm text-red-500 hover:text-red-400 transition-colors uppercase"
            >
              RETRY
            </button>
          )}
        </div>
      )}
    </>
  )
}
