
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 뇌는 수십 초가 걸린다. 플랫폼 기본 상한에 먼저 잘리면 정체불명의 타임아웃이 나간다.
export const maxDuration = 90

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const UPSTREAM_TIMEOUT_MS = 75_000

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

  // 이력은 모양만 보고 넘긴다 — 실제 검증은 NestJS 가 한다. BFF 의 일은 통과시키는 것이다.
  const history = Array.isArray(body.history) ? body.history : []

  // 고른 언어. 허용 목록은 NestJS 가 갖고 있어 여기서는 타입만 본다. 없으면 아예 안 보낸다.
  const lang = typeof body.lang === 'string' ? body.lang : undefined

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
        Authorization: authorization,
        'x-service-token': serviceToken,
      },
      body: JSON.stringify({ text: question, history, ...(lang ? { lang } : {}) }),
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
    // 401 만 그대로 전달한다 — 새로고침으로 복구할 수 있는 유일한 경우다.
    const status = upstream.status === 401 ? 401 : 502
    return NextResponse.json({ error: status === 401 ? 'unauthorized' : 'upstream_error' }, { status })
  }

  return NextResponse.json(await upstream.json())
}
