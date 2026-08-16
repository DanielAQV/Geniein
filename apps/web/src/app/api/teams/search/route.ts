/**
 * Teams 탭 검색 BFF.
 *
 * 브라우저는 이 경로까지만 안다. 여기서 서버가 NestJS 를 부르므로
 * `CORS_ORIGINS` 도 CSP `connect-src` 도 'self' 로 남는다
 * (docs/TEAMS_TAB_DESIGN.md 3.3).
 *
 * 관리자 BFF(/api/admin/*)와 다른 점: 신원이 **세션 쿠키가 아니라 Bearer** 다.
 * Teams iframe 은 서드파티 컨텍스트라 세션 쿠키가 브라우저 정책에 막힌다.
 *
 * ★ 이 파일은 신원을 **검증하지 않는다.** Bearer 를 그대로 넘기고, 검증은
 *   NestJS 의 EntraAuthGuard 가 한다 (설계 3.2 — 신뢰 경계는 거기 하나다).
 *   여기서 한 번 더 검증하면 진실이 둘이 되고, 약한 쪽이 우회 경로가 된다.
 *   대신 형식이 틀린 요청은 상류를 부르기 전에 끊는다.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 뇌가 도구 연쇄 + LLM 이라 수십 초가 걸린다. 플랫폼 기본 상한에 먼저 잘리면
// NestJS 가 만든 오류 대신 정체불명의 타임아웃이 브라우저로 간다.
export const maxDuration = 90

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/** NestJS 쪽 상한(60초)보다 길게 잡는다 — 그래야 상류의 502 가 그대로 보인다. */
const UPSTREAM_TIMEOUT_MS = 75_000

const MAX_QUESTION_LENGTH = 2000

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  let text: unknown
  try {
    text = (await request.json())?.text
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const question = typeof text === 'string' ? text.trim() : ''
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: 'invalid_text' }, { status: 400 })
  }

  const serviceToken = process.env.ADMIN_SERVICE_TOKEN
  if (!serviceToken) {
    console.error('[bff] ADMIN_SERVICE_TOKEN 이 설정되지 않았습니다')
    return NextResponse.json({ error: 'upstream_not_configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}/agent/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 사용자 신원 — NestJS 의 EntraAuthGuard 가 검증한다
        Authorization: authorization,
        // 호출자 신원 — 이 요청이 우리 BFF 에서 왔음을 NestJS 에 증명한다
        'x-service-token': serviceToken,
      },
      body: JSON.stringify({ text: question }),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[bff] NestJS 호출 실패:', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 상류 본문을 그대로 흘리지 않는다 — 내부 오류 메시지가 브라우저로 나간다.
    console.error('[bff] NestJS 응답 %d', upstream.status)
    // 401 만 그대로 전달한다. 토큰 만료는 사용자가 새로고침으로 복구할 수 있는
    // 유일한 경우라, 502 로 뭉뚱그리면 화면이 잘못된 안내를 하게 된다.
    const status = upstream.status === 401 ? 401 : 502
    return NextResponse.json({ error: status === 401 ? 'unauthorized' : 'upstream_error' }, { status })
  }

  return NextResponse.json(await upstream.json())
}
