/**
 * Teams 탭 공통 껍데기.
 *
 * 하는 일은 테마를 세우는 것 하나뿐이다. 사이트는 다크 고정인데 탭은 Teams 호스트를
 * 따라야 해서, 여기서 `data-teams-theme` 를 세우면 globals.css 가 그 속성에 걸어 둔
 * 토큰으로 안쪽 색을 전부 바꾼다.
 *
 * ★ 첫 페인트부터 맞아야 한다. effect 로만 세우면 다크로 한 번 그렸다가 라이트로
 *   바뀌는 것이 눈에 보인다 — 매번 탭을 열 때마다 화면이 번쩍인다. 그래서 인라인
 *   스크립트로 hydration 전에 세운다.
 *
 * ★ 값의 출처는 **매니페스트의 `?theme={theme}`** 다. Teams 가 탭을 열 때 실제
 *   테마로 치환해서 준다 (apps/teams-app/manifest.template.json). 그래서 SDK 응답을
 *   기다리지 않고도 처음부터 맞출 수 있다. SDK 는 그 뒤의 **변경**을 따라가는 용도다.
 */

import type { ReactNode } from 'react'
import { TeamsThemeSync } from './_components/teams-theme-sync'

/**
 * hydration 전에 도는 코드. 실패해도 화면은 떠야 하므로 통째로 try 로 감싼다.
 * 모르는 값이 오면 라이트로 — Teams 기본값이 라이트다.
 */
const BOOT_THEME_SCRIPT = `
(function () {
  try {
    var t = new URLSearchParams(location.search).get('theme');
    document.documentElement.setAttribute(
      'data-teams-theme',
      t === 'dark' || t === 'contrast' ? t : 'default'
    );
  } catch (e) {}
})();
`.trim()

export default function TeamsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_THEME_SCRIPT }} />
      <TeamsThemeSync />
      {children}
    </>
  )
}
