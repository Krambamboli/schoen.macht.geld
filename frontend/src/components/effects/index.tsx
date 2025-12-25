'use client'

import { useEffect } from 'react'
import { useEffects } from '@/contexts/effects-context'
import { TerminalBoot } from './terminal-boot'
import { HackerMode } from './hacker-mode'
import { DrunkMode } from './drunk-mode'
import { RedactedMode } from './redacted-mode'
import { SettingsPanel } from './settings-panel'

export function EffectsLayer() {
  const { isEffectEnabled } = useEffects()

  // Sync body classes with enabled effects
  useEffect(() => {
    const body = document.body

    // Hacker mode
    if (isEffectEnabled('hacker')) {
      body.classList.add('hacker-mode')
    } else {
      body.classList.remove('hacker-mode')
    }

    // Drunk mode
    if (isEffectEnabled('drunk')) {
      body.classList.add('drunk-mode')
    } else {
      body.classList.remove('drunk-mode')
    }

    // Redacted mode
    if (isEffectEnabled('redacted')) {
      body.classList.add('redacted-mode')
    } else {
      body.classList.remove('redacted-mode')
    }

    return () => {
      body.classList.remove('hacker-mode', 'drunk-mode', 'redacted-mode')
    }
  }, [isEffectEnabled])

  return (
    <>
      <TerminalBoot />
      <HackerMode />
      <DrunkMode />
      <RedactedMode />
      <SettingsPanel />
    </>
  )
}

export { TerminalBoot } from './terminal-boot'
export { HackerMode } from './hacker-mode'
export { DrunkMode } from './drunk-mode'
export { RedactedMode } from './redacted-mode'
export { SettingsPanel } from './settings-panel'
