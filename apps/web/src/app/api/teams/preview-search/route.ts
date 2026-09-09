
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 스트림은 답변이 끝날 때까지 열려 있다 (탭 본체의 스트리밍 경로와 같은 값).
export const maxDuration = 300

const IS_DEV = process.env.NODE_ENV !== 'production'
const UPSTREAM_TIMEOUT_MS = 75_000
const MAX_QUESTION_LENGTH = 2000

export async function POST(request: Request) {
  if (!IS_DEV) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const brainUrl = process.env.RAG_SERVICE_URL?.trim().replace(/\/+$/, '')
  const serviceToken = process.env.AGENT_SERVICE_TOKEN?.trim()
  const orgId = process.env.TEAMS_PREVIEW_ORG_ID?.trim()

  if (!brainUrl || !serviceToken || !orgId) {
    // 무엇이 빠졌는지는 서버 로그에만 적는다. 화면에는 "설정 안 됨"만 간다.
    console.warn(
      '[preview] RAG_SERVICE_URL / AGENT_SERVICE_TOKEN / TEAMS_PREVIEW_ORG_ID 가 필요합니다',
    )
    return NextResponse.json({ error: 'preview_not_configured' }, { status: 503 })
  }

  let body: { text?: unknown; history?: unknown }
  try {
    body = (await request.json()) ?? {}
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const question = typeof body.text === 'string' ? body.text.trim() : ''
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: 'invalid_text' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${brainUrl}/agent/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-token': serviceToken,
      },
      body: JSON.stringify({
        text: question,
        history: Array.isArray(body.history) ? body.history : [],
        internal_user_id: `${orgId}:teams-preview`,
        org_id: orgId,
        roles: [],
      }),
      cache: 'no-store',
      // 첫 응답까지만 건다. 스트림 전체에 걸면 긴 답변이 중간에 끊긴다.
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[preview] 뇌 호출 실패:', error)
    return NextResponse.json({ error: 'brain_unreachable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    console.error('[preview] 뇌 응답 오류:', upstream.status)
    return NextResponse.json({ error: 'brain_error' }, { status: 502 })
  }

  // 탭 본체와 같은 NDJSON 을 그대로 흘린다 — 화면이 두 경로를 구분할 필요가 없게.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
