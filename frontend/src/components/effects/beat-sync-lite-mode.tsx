'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useEffects } from '@/contexts/effects-context'

/**
 * Beat Sync Lite - A performance-optimized version of Beat Sync
 * Only animates scale + rotate on body children, no overlays or secondary effects
 */
export function BeatSyncLiteMode() {
  const { isEffectEnabled, getEffectIntensity, setBeatState } = useEffects()
  const isEnabled = isEffectEnabled('beatSyncLite')
  const intensity = getEffectIntensity('beatSyncLite')

  // Simple effect values - just scale and rotate
  const scaleAmount = 1 + (intensity / 100) * 0.06 // 1.0 to 1.06
  const rotateAmount = (intensity / 100) * 1.5 // 0 to 1.5 degrees

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

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const microphone = audioContext.createMediaStreamSource(stream)

      const { createRealTimeBpmProcessor } = await import('realtime-bpm-analyzer')
      const analyzer = await createRealTimeBpmProcessor(audioContext, {
        continuousAnalysis: true,
        stabilizationTime: 10000,
      })
      analyzerRef.current = analyzer

      microphone.connect(analyzer.node)

      setBeatState({ bpm: 0, status: 'listening', confidence: 0 })

      let lastBpm = 0
      let lastStatus: string = 'idle'

      analyzer.on('bpm', (data) => {
        if (data.bpm && data.bpm.length > 0) {
          const topCandidate = data.bpm[0]
          const bpm = Math.round(topCandidate.tempo)
          const confidence = topCandidate.count / 100

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
      console.error('Beat sync lite error:', error)
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

  // Apply CSS variables only when intensity changes, not on every pulse
  useEffect(() => {
    const body = document.body
    if (isEnabled) {
      body.classList.add('effect-beatSyncLite')
      body.style.setProperty('--beat-lite-scale', String(scaleAmount))
      body.style.setProperty('--beat-lite-rotate', `${rotateAmount}deg`)
    } else {
      body.classList.remove('effect-beatSyncLite')
      body.style.removeProperty('--beat-lite-scale')
      body.style.removeProperty('--beat-lite-rotate')
    }

    return () => {
      body.classList.remove('effect-beatSyncLite')
      body.style.removeProperty('--beat-lite-scale')
      body.style.removeProperty('--beat-lite-rotate')
    }
  }, [isEnabled, scaleAmount, rotateAmount])

  // Toggle pulse class - this is the only thing that changes on each beat
  useEffect(() => {
    const body = document.body
    if (pulse) {
      body.classList.add('beat-lite-pulse')
    } else {
      body.classList.remove('beat-lite-pulse')
    }
  }, [pulse])

  if (!isEnabled) return null

  // Minimal CSS - just scale and rotate, no overlays
  // Disable shadows during effect to prevent expensive repaints
  return (
    <style jsx global>{`
      body.effect-beatSyncLite {
        overflow: hidden;
      }

      body.effect-beatSyncLite > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
        transform-origin: center center;
        transition: transform 0.08s ease-out;
        will-change: transform;
      }

      body.effect-beatSyncLite.beat-lite-pulse > *:not([data-radix-popper-content-wrapper]):not([vaul-drawer-wrapper]):not([data-effects-settings]) {
        transform: scale(var(--beat-lite-scale, 1.03)) rotate(var(--beat-lite-rotate, 0.5deg));
      }

      /* Disable shadows to prevent expensive repaints during transforms */
      body.effect-beatSyncLite * {
        text-shadow: none !important;
        box-shadow: none !important;
        filter: none !important;
      }

      /* Ensure dialogs are not affected */
      body.effect-beatSyncLite [data-radix-popper-content-wrapper],
      body.effect-beatSyncLite [data-radix-popper-content-wrapper] *,
      body.effect-beatSyncLite [role="dialog"],
      body.effect-beatSyncLite [role="dialog"] *,
      body.effect-beatSyncLite [data-effects-settings] {
        transform: none !important;
      }
    `}</style>
  )
}
