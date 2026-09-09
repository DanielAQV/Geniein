'use client'

/**
 * Teams 호스트 테마를 따라간다.
 *
 * 사이트 전체는 다크로 고정돼 있다 (`app/layout.tsx` 의 ThemeProvider). 탭이 그걸
 * 그대로 물려받으면 Teams 를 라이트로 쓰는 사람 화면에서 여기만 시커멓게 뜬다.
 *
 * ★ next-themes 로 바꾸지 않는다. 그건 선택을 localStorage 에 저장하는데, 탭과
 *   회사 사이트가 **같은 오리진**이라 탭에서 라이트로 바꾸면 회사 사이트까지
 *   따라 바뀐다. 여기서는 `data-teams-theme` 속성만 세우고, 색은 globals.css 가
 *   그 속성에 걸어 둔 토큰으로 해결한다.
 *
 * 첫 페인트는 layout.tsx 의 인라인 스크립트가 URL 의 `?theme=` 로 이미 맞춰 둔다.
 * 이 컴포넌트가 하는 일은 (1) 그 값이 없을 때 SDK 에서 받아오는 것과
 * (2) 사용자가 Teams 테마를 **바꿨을 때** 따라가는 것이다.
 */

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
        // Teams 밖이거나 초기화 실패. 인라인 스크립트가 세워 둔 값을 그대로 둔다 —
        // 테마를 못 읽은 것이 화면을 못 쓰게 만들 이유는 없다.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
