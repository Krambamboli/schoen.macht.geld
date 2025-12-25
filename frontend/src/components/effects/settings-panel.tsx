'use client'

import { Settings } from 'lucide-react'
import { useEffects, EffectType } from '@/contexts/effects-context'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface EffectOption {
  id: EffectType
  label: string
  description: string
}

const STARTUP_EFFECTS: EffectOption[] = [
  {
    id: 'boot',
    label: 'Terminal Boot',
    description: 'Fake boot sequence on page load',
  },
]

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
]

export function SettingsPanel() {
  const {
    effectsDisabled,
    setEffectsDisabled,
    enabledEffects,
    toggleEffect,
    settingsPanelOpen,
    setSettingsPanelOpen,
  } = useEffects()

  const renderEffectToggle = (effect: EffectOption) => (
    <div
      key={effect.id}
      className={`flex items-center justify-between ${
        effectsDisabled ? 'opacity-50' : ''
      }`}
    >
      <div>
        <Label htmlFor={effect.id} className="text-base">
          {effect.label}
        </Label>
        <p className="text-sm text-muted-foreground">
          {effect.description}
        </p>
      </div>
      <Switch
        id={effect.id}
        checked={enabledEffects.has(effect.id)}
        onCheckedChange={() => toggleEffect(effect.id)}
        disabled={effectsDisabled}
      />
    </div>
  )

  return (
    <>
      {/* Floating settings button - hidden when panel is open */}
      {!settingsPanelOpen && (
        <button
          onClick={() => setSettingsPanelOpen(true)}
          data-effects-settings
          className="fixed bottom-4 right-4 z-[9990] p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg transition-all hover:scale-110"
          title="Visual Effects Settings (Ctrl+Shift+E)"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}

      {/* Settings sheet */}
      <Sheet open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Visual Effects</SheetTitle>
            <SheetDescription>
              Toggle visual effects. Use Ctrl+Shift+E to open this panel.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="disable-all" className="text-base font-medium">
                  Disable All Effects
                </Label>
                <p className="text-sm text-muted-foreground">
                  Turn off all visual effects
                </p>
              </div>
              <Switch
                id="disable-all"
                checked={effectsDisabled}
                onCheckedChange={setEffectsDisabled}
              />
            </div>

            <Separator />

            {/* Startup effects */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Startup
              </h4>
              {STARTUP_EFFECTS.map(renderEffectToggle)}
            </div>

            <Separator />

            {/* Visual modes */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Visual Modes
              </h4>
              {VISUAL_MODES.map(renderEffectToggle)}
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