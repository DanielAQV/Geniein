/** 가이드 목록. 본문과 같은 경계를 지난다 (lib/teams/verify-server.ts). */

import { NextResponse } from 'next/server'
import { listGuides } from '@/lib/guides'
import { rejectUnlessSignedIn } from '@/lib/teams/verify-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = await rejectUnlessSignedIn(request)
  if (denied) return denied

  return NextResponse.json({ guides: await listGuides() })
}
