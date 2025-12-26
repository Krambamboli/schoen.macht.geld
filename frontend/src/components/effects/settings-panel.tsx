'use client'

import { useEffects, EffectType } from '@/contexts/effects-context'
import { useEvents } from '@/contexts/events-context'
import { EFFECT_KEYS } from '@/hooks/use-hotkeys'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EffectOption {
  id: EffectType
  label: string
  description: string
}

const VISUAL_MODES: EffectOption[] = [
  {
    id: 'hacker',
    label: 'Hacker Mode',
    description: 'Matrix rain with green terminal aesthetic',
  },
  {
    id: 'drunk',
    label: 'Drunk Mode',
    description: 'Wobble and blur for after-hours trading',
  },
  {
    id: 'redacted',
    label: 'Redacted Mode',
    description: 'Classified document with black bars',
  },
  {
    id: 'crt',
    label: 'CRT Scanlines',
    description: 'Retro monitor with scanlines and flicker',
  },
  {
    id: 'glitch',
    label: 'Glitch/Static',
    description: 'VHS tracking errors and chromatic aberration',
  },
  {
    id: 'dvd',
    label: 'DVD Logo',
    description: 'Classic bouncing logo screensaver',
  },
  {
    id: 'binary',
    label: 'Binary Rain',
    description: 'Subtle 0s and 1s in the margins',
  },
  {
    id: 'beatSync',
    label: 'Beat Sync',
    description: 'Screen pulses to music via microphone',
  },
  {
    id: 'beatSyncLite',
    label: 'Beat Sync Lite',
    description: 'Lightweight pulse effect (better performance)',
  },
]

const RETRO_CRT_EFFECTS: EffectOption[] = [
  {
    id: 'phosphor',
    label: 'Phosphor Glow',
    description: 'Subtle text glow like old CRT monitors',
  },
  {
    id: 'flicker',
    label: 'Screen Flicker',
    description: 'Occasional brightness variation',
  },
  {
    id: 'noise',
    label: 'Noise Grain',
    description: 'Analog static noise overlay',
  },
  {
    id: 'interlace',
    label: 'Interlacing',
    description: 'Horizontal scanline pattern',
  },
]

// Helper to get hotkey for an effect
const getEffectHotkey = (effectId: EffectType): string | null => {
  const mapping = EFFECT_KEYS.find((ek) => ek.effect === effectId)
  return mapping?.key ?? null
}

export function SettingsPanel() {
  const {
    enabledEffects,
    toggleEffect,
    disableAllEffects,
    getEffectIntensity,
    setEffectIntensity,
    settingsPanelOpen,
    setSettingsPanelOpen,
    stockMarqueeEnabled,
    setStockMarqueeEnabled,
    headlinesMarqueeEnabled,
    setHeadlinesMarqueeEnabled,
    stockMarqueePosition,
    setStockMarqueePosition,
    headlinesMarqueePosition,
    setHeadlinesMarqueePosition,
    marqueeScrollSpeed,
    setMarqueeScrollSpeed,
    kioskMode,
    setKioskMode,
  } = useEffects()

  const { eventsEnabled, setEventsEnabled } = useEvents()

  const renderEffectToggle = (effect: EffectOption) => {
    const isEnabled = enabledEffects.has(effect.id)
    const intensity = getEffectIntensity(effect.id)
    const hotkey = getEffectHotkey(effect.id)

    return (
      <div key={effect.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor={effect.id} className="text-base">
                {effect.label}
              </Label>
              {hotkey && (
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black text-primary border border-border">
                  {hotkey}
                </kbd>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{effect.description}</p>
          </div>
          <Switch
            id={effect.id}
            checked={isEnabled}
            onCheckedChange={() => toggleEffect(effect.id)}
          />
        </div>
        {isEnabled && (
          <div className="flex items-center gap-3 pl-1">
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setEffectIntensity(effect.id, value)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {intensity}%
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Settings sheet */}
      <Sheet open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
        <SheetContent side="right" className="w-80 z-[200] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Toggle effects. Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black text-primary border border-border">F12</kbd> to open/close.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 flex-1 overflow-y-auto pr-2">
            {/* Marquee Tickers section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Laufbänder
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stockMarquee" className="text-base">
                      Kurse-Laufband
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Aktienkurse anzeigen
                    </p>
                  </div>
                  <Switch
                    id="stockMarquee"
                    checked={stockMarqueeEnabled}
                    onCheckedChange={setStockMarqueeEnabled}
                  />
                </div>
                {stockMarqueeEnabled && (
                  <div className="pl-1">
                    <Label htmlFor="stockMarqueePosition" className="text-sm text-muted-foreground">
                      Position
                    </Label>
                    <Select value={stockMarqueePosition} onValueChange={setStockMarqueePosition}>
                      <SelectTrigger id="stockMarqueePosition" className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Oben</SelectItem>
                        <SelectItem value="bottom">Unten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="headlinesMarquee" className="text-base">
                      News-Laufband
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Schlagzeilen anzeigen
                    </p>
                  </div>
                  <Switch
                    id="headlinesMarquee"
                    checked={headlinesMarqueeEnabled}
                    onCheckedChange={setHeadlinesMarqueeEnabled}
                  />
                </div>
                {headlinesMarqueeEnabled && (
                  <div className="pl-1">
                    <Label htmlFor="headlinesMarqueePosition" className="text-sm text-muted-foreground">
                      Position
                    </Label>
                    <Select value={headlinesMarqueePosition} onValueChange={setHeadlinesMarqueePosition}>
                      <SelectTrigger id="headlinesMarqueePosition" className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Oben</SelectItem>
                        <SelectItem value="bottom">Unten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {(stockMarqueeEnabled || headlinesMarqueeEnabled) && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-muted-foreground">
                    Scroll-Geschwindigkeit
                  </Label>
                  <div className="flex items-center gap-3 pl-1">
                    <Slider
                      value={[marqueeScrollSpeed]}
                      onValueChange={([value]) => setMarqueeScrollSpeed(value)}
                      min={0.25}
                      max={3}
                      step={0.25}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                      {marqueeScrollSpeed.toFixed(2)}x
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Display Mode section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Anzeigemodus
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="kioskMode" className="text-base">
                    Kiosk-Modus
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Größere Schrift für Overhead-Displays
                  </p>
                </div>
                <Switch
                  id="kioskMode"
                  checked={kioskMode}
                  onCheckedChange={setKioskMode}
                />
              </div>
            </div>

            <Separator />

            {/* Animations section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Animations
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="boot" className="text-base">
                    Terminal Boot
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Fake boot sequence on page load
                  </p>
                </div>
                <Switch
                  id="boot"
                  checked={enabledEffects.has('boot')}
                  onCheckedChange={() => toggleEffect('boot')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="events" className="text-base">
                    Event Celebrations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New #1, all-time highs, crashes
                  </p>
                </div>
                <Switch
                  id="events"
                  checked={eventsEnabled}
                  onCheckedChange={setEventsEnabled}
                />
              </div>
            </div>

            <Separator />

            {/* Visual Effects header with disable button */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Visual Effects
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={disableAllEffects}
                className="text-xs"
              >
                Disable All
              </Button>
            </div>

            {/* Visual modes */}
            <div className="space-y-4">
              {VISUAL_MODES.map(renderEffectToggle)}
            </div>

            <Separator />

            {/* Retro CRT Effects */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Retro CRT Effects
              </h4>
              {RETRO_CRT_EFFECTS.map(renderEffectToggle)}
            </div>

            <Separator />

            {/* Keyboard Shortcuts */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Keyboard Shortcuts
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">F1-F8</kbd>
                  <span className="text-muted-foreground">Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">1-0</kbd>
                  <span className="text-muted-foreground">Effects</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">M</kbd>
                  <span className="text-muted-foreground">Stock ticker</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">N</kbd>
                  <span className="text-muted-foreground">News ticker</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">K</kbd>
                  <span className="text-muted-foreground">Kiosk mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">B</kbd>
                  <span className="text-muted-foreground">Boot anim</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">E</kbd>
                  <span className="text-muted-foreground">Disable all</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 font-mono bg-black text-primary border border-border">F12</kbd>
                  <span className="text-muted-foreground">Settings</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Settings are saved to your browser.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}