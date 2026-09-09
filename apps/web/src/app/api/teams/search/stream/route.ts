
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 스트림은 답변이 끝날 때까지 열려 있다. 여기서 잘리면 답이 중간에 끊긴 것으로 보인다.
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
      // AbortSignal.timeout 을 걸지 않는다 — 본문 수신 중에도 발동해 긴 답변을 끊는다.
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
      // nginx 설정이 한 번 어긋나면 스트리밍이 조용히 사라진다. 헤더로 한 겹 더 잠근다.
      'X-Accel-Buffering': 'no',
    },
  })
}
