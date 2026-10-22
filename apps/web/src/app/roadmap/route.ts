/**
 * 경영진 로드맵. 허용 목록의 M365 계정만 본다.
 *
 * ★ 본문(토큰 발행·투자 일정)은 저장소에 두지 않는다 — regulations/ 와 같은 취급이다.
 *   서버에 파일로만 올리고 `ROADMAP_HTML_PATH` 로 가리킨다.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse, type NextRequest } from 'next/server'
import { ROADMAP_COOKIE, ROADMAP_ROLE } from '@/lib/auth/entra-web'
import { verifySessionToken } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(ROADMAP_COOKIE)?.value)
  if (!session?.roles?.includes(ROADMAP_ROLE)) {
    const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, '') || request.nextUrl.origin
    return NextResponse.redirect(`${origin}/api/auth/entra/login`)
  }

  const file = process.env.ROADMAP_HTML_PATH || path.join(process.cwd(), 'content', 'private', 'roadmap.html')
  let html: string
  try {
    html = await readFile(file, 'utf8')
  } catch (error) {
    console.error('[roadmap] 본문 파일을 읽지 못했습니다:', file, error)
    return new NextResponse('로드맵 파일이 아직 올라오지 않았습니다.', { status: 503 })
  }

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
