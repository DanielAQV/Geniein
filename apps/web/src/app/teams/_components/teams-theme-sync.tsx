'use client'


import { useEffect } from 'react'
import { initTeams } from '@/lib/teams/client'

export type TeamsTheme = 'default' | 'dark' | 'contrast'

export function normalizeTheme(value: unknown): TeamsTheme {
  return value === 'dark' || value === 'contrast' ? value : 'default'
}

export function TeamsThemeSync() {
  useEffect(() => {
    let cancelled = false

    const apply = (value: unknown) => {
      if (cancelled) return
      document.documentElement.setAttribute('data-teams-theme', normalizeTheme(value))
    }

    void (async () => {
      try {
        await initTeams()
        const { app } = await import('@microsoft/teams-js')
        const context = await app.getContext()
        apply(context.app.theme)
        app.registerOnThemeChangeHandler(apply)
      } catch {
        // Teams 밖이거나 초기화 실패. 인라인 스크립트가 세워 둔 값을 그대로 둔다.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
