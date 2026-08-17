/**
 * Teams 탭 검색 BFF — 스트리밍.
 *
 * `../route.ts`(한 번에 답하는 경로)와 같은 일을 하고, 다른 점은 상류의 NDJSON 을
 * **그대로 흘린다**는 것뿐이다. 신원 검증도 여기서 하지 않는다 — Bearer 를 넘기고
 * NestJS 의 EntraAuthGuard 가 판단한다 (신뢰 경계는 거기 하나다).
 *
 * ★ 본문을 읽지 않는다. `upstream.body` 를 Response 에 그대로 물려주면 Node 가
 *   중간에 버퍼링하지 않고 흘린다. 여기서 줄을 모았다가 다시 내보내면 계층마다
 *   파서가 생기고, 그중 하나가 어긋날 때 원인을 찾기 어려워진다.
 *
 * ★ 비스트리밍 경로를 남겨 둔다. `/teams/preview` 가 그쪽을 쓰고, 스트림이 막히는
 *   환경(중간 프록시가 버퍼링하는 사내망 등)에서 되돌릴 자리가 필요하다.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 스트림은 답변이 끝날 때까지 열려 있다. 비스트리밍 경로(90)보다 넉넉해야 한다 —
// 여기서 잘리면 사용자는 답이 중간에 끊긴 것을 본다.
export const maxDuration = 300

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const MAX_QUESTION_LENGTH = 2000

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  let body: { text?: unknown; history?: unknown; lang?: unknown }
  try {
    body = (await request.json()) ?? {}
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const question = typeof body.text === 'string' ? body.text.trim() : ''
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: 'invalid_text' }, { status: 400 })
  }

  const history = Array.isArray(body.history) ? body.history : []
  const lang = typeof body.lang === 'string' ? body.lang : undefined

  const serviceToken = process.env.ADMIN_SERVICE_TOKEN
  if (!serviceToken) {
    console.error('[bff] ADMIN_SERVICE_TOKEN 이 설정되지 않았습니다')
    return NextResponse.json({ error: 'upstream_not_configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}/agent/search/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'x-service-token': serviceToken,
      },
      body: JSON.stringify({ text: question, history, ...(lang ? { lang } : {}) }),
      cache: 'no-store',
      // ★ AbortSignal.timeout 을 걸지 않는다. 그것은 본문 수신 중에도 발동해서
      //   긴 답변을 중간에 끊는다. 상류(NestJS)가 첫 응답까지의 상한을 갖고 있고,
      //   스트림 자체의 상한은 nginx proxy_read_timeout(300s) 이다.
    })
  } catch (error) {
    console.error('[bff] NestJS 스트림 호출 실패:', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    console.error('[bff] NestJS 응답 %d', upstream.status)
    const status = upstream.status === 401 ? 401 : 502
    return NextResponse.json(
      { error: status === 401 ? 'unauthorized' : 'upstream_error' },
      { status },
    )
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // nginx 두 겹에 proxy_buffering off 가 있지만, 한 번 어긋나면 스트리밍이
      // 조용히 사라지고 증상은 "느려졌다"로만 보인다. 헤더로 한 겹 더 잠근다.
      'X-Accel-Buffering': 'no',
    },
  })
}
