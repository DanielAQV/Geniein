
import type { ReactNode } from 'react'
import { TeamsThemeSync } from './_components/teams-theme-sync'

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
