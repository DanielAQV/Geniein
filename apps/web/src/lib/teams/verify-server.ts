/**
 * BFF 경계 — 이 요청이 우리 테넌트의 로그인한 사용자에게서 온 것인가.
 *
 * ★ 검증을 여기서 직접 하지 않는다. Entra 토큰 검증(JWKS·발급자·audience·허용
 *   테넌트)은 NestJS 의 `EntraAuthGuard` 에 이미 있고, 그 로직이 두 벌이 되는
 *   순간 한쪽만 고쳐지는 날이 온다. 그래서 **이미 보호된 경로를 한 번 찔러**
 *   토큰이 살아 있는지만 확인한다.
 *
 * ★ 가이드 본문은 사내 결재 절차와 팀 구조를 담는다. 페이지 껍데기는 공개여도
 *   본문은 이 경계를 지나야 한다 — `/teams/search` 가 화면은 공개고 데이터만
 *   토큰으로 가져오는 것과 같은 모양이다.
 */

import { NextResponse } from 'next/server'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const UPSTREAM_TIMEOUT_MS = 10_000

/** 통과하면 `null`, 막히면 그대로 돌려줄 응답. */
export async function rejectUnlessSignedIn(request: Request): Promise<NextResponse | null> {
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
      headers: { Authorization: authorization, 'x-service-token': serviceToken },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[bff] 토큰 확인 실패:', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 401 은 그대로 넘긴다 — 화면이 토큰을 다시 받아야 한다는 뜻이다.
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: upstream.status === 401 ? 401 : 502 },
    )
  }

  return null
}
