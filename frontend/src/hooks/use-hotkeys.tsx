'use client'

import { useEffect, useCallback, createContext, useContext, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffects, EffectType } from '@/contexts/effects-context'
import { toast } from '@/hooks/use-toast'

// View routes mapped to F keys
const VIEW_ROUTES = [
  { key: 'F1', path: '/display/bloomberg', label: 'Bloomberg' },
  { key: 'F2', path: '/display/market-map', label: 'Market Map' },
  { key: 'F3', path: '/display/terminal', label: 'Terminal' },
  { key: 'F4', path: '/display/leaderboard', label: 'Leaderboard' },
  { key: 'F5', path: '/display/stock-chart', label: 'Stock Chart' },
  { key: 'F6', path: '/display/performance-race', label: 'Race' },
  { key: 'F7', path: '/display/ipo-spotlight', label: 'IPO' },
  { key: 'F8', path: '/display/sector-sunburst', label: 'Sectors' },
]

// Effects mapped to number keys
const EFFECT_KEYS: { key: string; effect: EffectType; label: string }[] = [
  { key: '1', effect: 'hacker', label: 'Hacker' },
  { key: '2', effect: 'drunk', label: 'Drunk' },
  { key: '3', effect: 'crt', label: 'CRT' },
  { key: '4', effect: 'glitch', label: 'Glitch' },
  { key: '5', effect: 'redacted', label: 'Redacted' },
  { key: '6', effect: 'binary', label: 'Binary' },
  { key: '7', effect: 'dvd', label: 'DVD' },
  { key: '9', effect: 'beatSyncLite', label: 'Beat Lite' },
  { key: '0', effect: 'beatSync', label: 'Beat Sync' },
]

// Settings hotkeys
const SETTING_KEYS = {
  stockMarquee: { key: 'M', label: 'Stock Ticker' },
  headlinesMarquee: { key: 'N', label: 'News Ticker' },
  kioskMode: { key: 'K', label: 'Kiosk Mode' },
  boot: { key: 'B', label: 'Boot Animation' },
}

interface HotkeysContextType {
  showHelp: () => void
}

const HotkeysContext = createContext<HotkeysContextType | null>(null)

export function HotkeysProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    toggleEffect,
    isEffectEnabled,
    disableAllEffects,
    enabledEffects,
    setSettingsPanelOpen,
    stockMarqueeEnabled,
    setStockMarqueeEnabled,
    headlinesMarqueeEnabled,
    setHeadlinesMarqueeEnabled,
    kioskMode,
    setKioskMode,
  } = useEffects()
  const [hasShownInitialHelp, setHasShownInitialHelp] = useState(false)

  const showHelp = useCallback(() => {
    toast({
      title: 'Keyboard Shortcuts',
      description: (
        <div className="text-xs space-y-2 mt-2">
          <div>
            <span className="font-semibold">Views:</span> F1-F8
          </div>
          <div>
            <span className="font-semibold">Effects:</span> 1-7, 0
          </div>
          <div>
            <span className="font-semibold">M</span> = Stock ticker | <span className="font-semibold">N</span> = News ticker
          </div>
          <div>
            <span className="font-semibold">K</span> = Kiosk mode | <span className="font-semibold">B</span> = Boot animation
          </div>
          <div>
            <span className="font-semibold">E</span> = Disable effects | <span className="font-semibold">F12</span> = Settings
          </div>
        </div>
      ),
      duration: 5000,
    })
  }, [])

  // Show help on first visit to display pages
  useEffect(() => {
    if (pathname?.startsWith('/display') && !hasShownInitialHelp) {
      const hasSeenHelp = localStorage.getItem('smg-hotkeys-help-shown')
      if (!hasSeenHelp) {
        setTimeout(() => {
          showHelp()
          localStorage.setItem('smg-hotkeys-help-shown', 'true')
        }, 1500)
      }
      setHasShownInitialHelp(true)
    }
  }, [pathname, hasShownInitialHelp, showHelp])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      // Handle ? for help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        showHelp()
        return
      }

      // Handle F12 to toggle settings panel
      if (e.key === 'F12') {
        e.preventDefault()
        setSettingsPanelOpen((prev) => !prev)
        return
      }

      // Handle E for disable all effects
      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        if (enabledEffects.size > 0) {
          disableAllEffects()
          toast({
            title: 'Effects Disabled',
            description: 'All visual effects have been turned off',
            duration: 2000,
          })
        } else {
          toast({
            title: 'No Effects Active',
            description: 'Press 1-9, 0 to enable effects',
            duration: 2000,
          })
        }
        return
      }

      // Handle M for stock marquee toggle
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        const newState = !stockMarqueeEnabled
        setStockMarqueeEnabled(newState)
        toast({
          title: `Stock Ticker ${newState ? 'Enabled' : 'Disabled'}`,
          description: `Press M to toggle`,
          duration: 1500,
        })
        return
      }

      // Handle N for headlines marquee toggle
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        const newState = !headlinesMarqueeEnabled
        setHeadlinesMarqueeEnabled(newState)
        toast({
          title: `News Ticker ${newState ? 'Enabled' : 'Disabled'}`,
          description: `Press N to toggle`,
          duration: 1500,
        })
        return
      }

      // Handle K for kiosk mode toggle
      if (e.key.toLowerCase() === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        const newState = !kioskMode
        setKioskMode(newState)
        toast({
          title: `Kiosk Mode ${newState ? 'Enabled' : 'Disabled'}`,
          description: newState ? 'Larger text for displays' : 'Normal text size',
          duration: 1500,
        })
        return
      }

      // Handle B for boot animation toggle
      if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        toggleEffect('boot')
        const isNowEnabled = !isEffectEnabled('boot')
        toast({
          title: `Boot Animation ${isNowEnabled ? 'Enabled' : 'Disabled'}`,
          description: isNowEnabled ? 'Will play on next page load' : 'Boot sequence disabled',
          duration: 1500,
        })
        return
      }

      // Handle F1-F8 for views
      const fKeyMatch = e.key.match(/^F([1-8])$/)
      if (fKeyMatch) {
        e.preventDefault()
        const index = parseInt(fKeyMatch[1]) - 1
        const route = VIEW_ROUTES[index]
        if (route) {
          router.push(route.path)
          toast({
            title: route.label,
            description: `Switched to ${route.label} view`,
            duration: 1500,
          })
        }
        return
      }

      // Handle number keys for effects
      if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const effectConfig = EFFECT_KEYS.find((ek) => ek.key === e.key)
        if (effectConfig) {
          toggleEffect(effectConfig.effect)
          const isNowEnabled = !isEffectEnabled(effectConfig.effect)
          toast({
            title: `${effectConfig.label} ${isNowEnabled ? 'Enabled' : 'Disabled'}`,
            description: `Press ${e.key} again to toggle`,
            duration: 1500,
          })
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, toggleEffect, isEffectEnabled, disableAllEffects, enabledEffects, setSettingsPanelOpen, showHelp, stockMarqueeEnabled, setStockMarqueeEnabled, headlinesMarqueeEnabled, setHeadlinesMarqueeEnabled, kioskMode, setKioskMode])

  return (
    <HotkeysContext.Provider value={{ showHelp }}>
      {children}
    </HotkeysContext.Provider>
  )
}

export function useHotkeys() {
  const context = useContext(HotkeysContext)
  if (!context) {
    throw new Error('useHotkeys must be used within a HotkeysProvider')
  }
  return context
}

// Export for use in settings panel
export { VIEW_ROUTES, EFFECT_KEYS, SETTING_KEYS }
