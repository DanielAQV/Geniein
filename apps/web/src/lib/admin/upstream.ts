/**
 * 관리자 BFF 의 공통 상류 호출.
 *
 * insights BFF 가 손으로 하던 것(세션 확인 → 서비스 토큰 → NestJS)을 한 곳에 모은다.
 * 라우트마다 복사하면 언젠가 한 곳에서 인증 한 줄이 빠지고, 그게 제일 찾기 어렵다.
 *
 * 설계문서 3.6 "Next.js route handler = 얇은 BFF".
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ForwardOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

/**
 * 세션을 확인하고 NestJS 로 넘긴다. 실패하면 NextResponse 를 그대로 돌려주므로
 * 호출부는 `return await forwardToAdminApi(...)` 한 줄이면 된다.
 */
export async function forwardToAdminApi(
  path: string,
  { method = 'GET', body }: ForwardOptions = {},
): Promise<NextResponse> {
  // middleware 가 이미 막지만 여기서도 확인한다.
  // matcher 를 잘못 건드리는 순간 조용히 열리는 게 이런 경로다.
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = process.env.ADMIN_SERVICE_TOKEN
  if (!token) {
    console.error('[bff] ADMIN_SERVICE_TOKEN 이 설정되지 않았습니다')
    return NextResponse.json({ error: 'upstream_not_configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}${path}`, {
      method,
      headers: {
        'x-service-token': token,
        // 감사 로그용. NestJS 가 "누구의 요청이었나"를 알 수 있어야 한다
        'x-acting-user': session.sub,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[bff] NestJS 호출 실패:', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 400 은 입력 문제라 관리자에게 사유가 보여야 고칠 수 있다.
    // 그 외에는 상류 본문을 흘리지 않는다 — 내부 오류 메시지가 브라우저로 나간다.
    if (upstream.status === 400 || upstream.status === 404) {
      const detail = await upstream.json().catch(() => null)
      return NextResponse.json(
        { error: 'invalid_request', message: detail?.message ?? null },
        { status: upstream.status },
      )
    }
    console.error('[bff] NestJS 응답 %d', upstream.status)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await upstream.json())
}

/** 요청 본문을 JSON 으로 읽는다. 깨져 있으면 null. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
