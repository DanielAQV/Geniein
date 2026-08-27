/** 가이드 한 장. 없는 slug 는 404, 토큰이 없으면 401. */

import { NextResponse } from 'next/server'
import { getGuide } from '@/lib/guides'
import { rejectUnlessSignedIn } from '@/lib/teams/verify-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const denied = await rejectUnlessSignedIn(request)
  if (denied) return denied

  const { slug } = await context.params
  const guide = await getGuide(slug)
  if (!guide) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(guide)
}
