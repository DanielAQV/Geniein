/**
 * 탭이 부팅할 때 한 번 부르는 경로 — 화면 문구를 무슨 언어로 그릴지 정한다.
 *
 * 검색과 같은 경계를 지난다 (Teams SSO 토큰 + 서비스 토큰). 다만 이 응답에는
 * **언어 하나뿐**이고 신원은 담기지 않는다 — 화면이 그 이상을 알 이유가 없다.
 *
 * ★ 실패해도 화면은 떠야 한다. 언어를 못 정한 것이 탭을 못 쓰게 만들 이유는
 *   없으므로, 호출부는 이 경로가 죽어도 Teams locale 로 떨어진다.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/** 검색과 달리 즉답이라 상한이 짧다. 여기서 오래 기다리면 탭이 늦게 뜬다. */
const UPSTREAM_TIMEOUT_MS = 10_000

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const serviceToken = process.env.ADMIN_SERVICE_TOKEN
  if (!serviceToken) {
    console.error('[bff] ADMIN_SERVICE_TOKEN 이 설정되지 않았습니다')
    return NextResponse.json({ error: 'upstream_not_configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}/agent/me`, {
      headers: {
        Authorization: authorization,
        'x-service-token': serviceToken,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[bff] NestJS 호출 실패(me):', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 401 만 그대로 넘긴다 — 토큰이 만료됐다는 뜻이라 화면이 새로고침을 안내해야 한다.
    const status = upstream.status === 401 ? 401 : 502
    return NextResponse.json({ error: 'upstream_error' }, { status })
  }

  const body = (await upstream.json()) as { language?: unknown }
  return NextResponse.json({
    language: typeof body.language === 'string' ? body.language : null,
  })
}
