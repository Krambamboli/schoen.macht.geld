'use client'

import { useEffect, useRef } from 'react'
import { useEffects } from '@/contexts/effects-context'

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'

// Pre-computed colors for performance - Bloomberg orange theme
const COLORS = [
  '#ffcc00',
  'rgba(255, 153, 0, 0.9)',
  'rgba(255, 153, 0, 0.7)',
  'rgba(255, 153, 0, 0.5)',
  'rgba(255, 153, 0, 0.3)',
  'rgba(255, 153, 0, 0.15)',
]

interface Column {
  x: number
  y: number
  speed: number
  chars: string[]
}

const TARGET_FPS = 20
const FRAME_INTERVAL = 1000 / TARGET_FPS

export function HackerMode() {
  const { isEffectEnabled, getEffectIntensity } = useEffects()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const columnsRef = useRef<Column[]>([])
  const animationRef = useRef<number>()
  const lastFrameRef = useRef<number>(0)

  const isEnabled = isEffectEnabled('hacker')
  const intensity = getEffectIntensity('hacker')

  // Calculate effect values based on intensity (0-100)
  const canvasOpacity = 0.1 + (intensity / 100) * 0.5 // 0.1 to 0.6
  const speedMultiplier = 0.5 + (intensity / 100) * 1 // 0.5x to 1.5x
  const tintOpacity = (intensity / 100) * 0.06 // 0 to 0.06

  useEffect(() => {
    if (!isEnabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const fontSize = 16
    const columnSpacing = 24 // Fewer columns (was 14)

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initColumns()
    }

    const initColumns = () => {
      const columnCount = Math.floor(canvas.width / columnSpacing)
      columnsRef.current = Array.from({ length: columnCount }, (_, i) => ({
        x: i * columnSpacing,
        y: Math.random() * canvas.height,
        speed: (3 + Math.random() * 3) * speedMultiplier,
        chars: Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      }))
    }

    const draw = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(draw)

      // Throttle to target FPS
      const elapsed = timestamp - lastFrameRef.current
      if (elapsed < FRAME_INTERVAL) return
      lastFrameRef.current = timestamp - (elapsed % FRAME_INTERVAL)

      // Fade effect - darker for faster fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px monospace`

      const cols = columnsRef.current
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c]
        const chars = col.chars
        const len = chars.length

        for (let i = 0; i < len; i++) {
          const y = col.y - i * fontSize
          if (y < 0 || y > canvas.height) continue

          // Use pre-computed colors
          ctx.fillStyle = COLORS[Math.min(i, COLORS.length - 1)]
          ctx.fillText(chars[i], col.x, y)
        }

        col.y += col.speed

        // Reset column
        if (col.y - len * fontSize > canvas.height) {
          col.y = 0
          col.speed = (3 + Math.random() * 3) * speedMultiplier
        }

        // Randomly change one character (less frequently)
        if (Math.random() < 0.01) {
          chars[Math.floor(Math.random() * len)] = CHARS[Math.floor(Math.random() * CHARS.length)]
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isEnabled, speedMultiplier])

  if (!isEnabled) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{ opacity: canvasOpacity }}
      />
      {/* Scanlines - pure CSS, no performance impact */}
      <div
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
        }}
      />
      <div
        className="fixed inset-0 z-[3] pointer-events-none"
        style={{ backgroundColor: `rgba(255, 153, 0, ${tintOpacity})` }}
      />
    </>
  )
}