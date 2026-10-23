/**
 * 경영진 로드맵. Entra 앱 역할 Roadmap.Viewer 를 받은 M365 계정만 본다.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ROADMAP_COOKIE, ROADMAP_ROLE } from '@/lib/auth/entra-web'
import { verifySessionToken } from '@/lib/auth/session'
import { RoadmapView } from './roadmap-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Beyond Communication',
  robots: { index: false, follow: false },
}

export default async function RoadmapPage() {
  const session = await verifySessionToken((await cookies()).get(ROADMAP_COOKIE)?.value)
  if (!session?.roles?.includes(ROADMAP_ROLE)) {
    const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, '') || ''
    redirect(`${origin}/api/auth/entra/login`)
  }
  return <RoadmapView />
}
