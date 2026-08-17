/**
 * 미리보기 전용 질의 경로 — **개발 빌드에만 존재한다.**
 *
 * 왜 필요한가: 탭 본체(/api/teams/search)는 Teams SSO 토큰을 요구하고, 그 토큰은
 * Teams 안에서만 나온다. 그래서 로컬에서는 화면을 띄워도 실제로 물어볼 수가 없었고,
 * 미리보기가 고정 응답을 내놓다 보니 **에이전트가 질문을 무시하는 것처럼 보였다.**
 *
 * ★ 이것은 인증 우회가 아니라 **다른 문(門)** 이다. 그리고 그 문은 운영 빌드에
 *   존재하지 않는다:
 *     1) `NODE_ENV !== 'production'` 이 아니면 404 로 끝난다. 운영 빌드는 항상
 *        production 이므로 이 경로는 구조적으로 닿을 수 없다.
 *     2) 설정이 하나라도 없으면 503 이다. "설정 안 했으니 열어둔다"의 반대다.
 *
 * ★ `org_id` 에 기본값을 두지 않는다. 기본값이 있으면 어느 법인의 문서를 뒤지는지
 *   모른 채 결과를 보게 되고, 그건 이 저장소가 §4.4 에서 닫은 구멍과 같은 종류다.
 *   `TEAMS_PREVIEW_ORG_ID` 를 명시해야만 동작한다.
 *
 * ★ 신원은 미리보기임이 드러나는 고정 값이다. 뇌의 감사 로그에서 사람의 질문과
 *   개발 중 질의가 섞이면 안 된다.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 뇌가 도구 연쇄 + LLM 이라 수십 초가 걸린다 (탭 본체와 같은 이유).
export const maxDuration = 90

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
    upstream = await fetch(`${brainUrl}/agent/message`, {
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
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[preview] 뇌 호출 실패:', error)
    return NextResponse.json({ error: 'brain_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    console.error('[preview] 뇌 응답 오류:', upstream.status)
    return NextResponse.json({ error: 'brain_error' }, { status: 502 })
  }

  const result = (await upstream.json()) as {
    text: string
    refused: boolean
    tool_trace: { name: string; outcome: string }[]
  }

  // 탭 본체와 같은 모양으로 돌려준다 — 화면이 두 경로를 구분할 필요가 없게.
  return NextResponse.json({
    text: result.text,
    refused: result.refused,
    tools: result.tool_trace.map((t) => ({ name: t.name, outcome: t.outcome })),
  })
}
