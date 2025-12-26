'use client'

import { useEffect, useState, useRef } from 'react'
import { useEffects } from '@/contexts/effects-context'

const BOOT_LINES = [
  { text: 'SMG BIOS v2.4.1', delay: 0 },
  { text: 'Copyright (c) 2025 Schoen Macht Geld Corp.', delay: 100 },
  { text: '', delay: 200 },
  { text: 'Memory Test: ', delay: 300, typing: true },
  { text: '65536K OK', delay: 800 },
  { text: '', delay: 900 },
  { text: 'Detecting Market Interfaces...', delay: 1000 },
  { text: '  > Stock Feed Controller [OK]', delay: 1200 },
  { text: '  > Price Matrix Decoder [OK]', delay: 1400 },
  { text: '  > Sentiment Analyzer [OK]', delay: 1600 },
  { text: '', delay: 1800 },
  { text: 'Loading SMG Trading Terminal v4.2.0...', delay: 1900 },
  { text: '', delay: 2100 },
  { text: 'Initializing modules:', delay: 2200 },
  { text: '  [################] market-data.sys', delay: 2400 },
  { text: '  [################] leaderboard.drv', delay: 2600 },
  { text: '  [################] portfolio.dll', delay: 2800 },
  { text: '', delay: 3000 },
  { text: 'Connecting to Frankfurt Stock Exchange...', delay: 3100 },
  { text: 'Connection established. Latency: 12ms', delay: 3400 },
  { text: '', delay: 3600 },
  { text: 'System ready.', delay: 3700 },
  { text: '', delay: 3900 },
  { text: '> Launching interface...', delay: 4000 },
]

const TOTAL_DURATION = 4500

export function TerminalBoot() {
  const { bootComplete, setBootComplete, isEffectEnabled, hydrated } = useEffects()
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [fadeOut, setFadeOut] = useState(false)
  const hasStartedRef = useRef(false)

  const isEnabled = isEffectEnabled('boot')

  useEffect(() => {
    // Wait for localStorage to be loaded before deciding
    if (!hydrated) return

    // Once animation has started, don't abort even if isEnabled changes
    if (bootComplete) return

    // If boot is disabled and we haven't started yet, skip
    if (!isEnabled && !hasStartedRef.current) {
      setBootComplete(true)
      return
    }

    // Mark as started so we don't abort if isEnabled changes during animation
    hasStartedRef.current = true

    const timers: NodeJS.Timeout[] = []

    BOOT_LINES.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line.text])
      }, line.delay)
      timers.push(timer)
    })

    // Start fade out
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, TOTAL_DURATION)
    timers.push(fadeTimer)

    // Complete boot
    const completeTimer = setTimeout(() => {
      setBootComplete(true)
    }, TOTAL_DURATION + 500)
    timers.push(completeTimer)

    return () => timers.forEach(clearTimeout)
  }, [hydrated, bootComplete, setBootComplete, isEnabled])

  if (bootComplete) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-start justify-start p-8 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="font-mono text-sm text-green-500 leading-relaxed">
        {visibleLines.map((line, index) => (
          <div key={index} className="whitespace-pre">
            {line || '\u00A0'}
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1" />
      </div>
    </div>
  )
}
