/**
 * 관리자 인사이트 BFF.
 *
 * 이전에는 브라우저가 NestJS 의 /insights/admin 을 직접 불렀다. 두 가지가 깨져 있었다:
 *   ① 그 엔드포인트에 인증이 없어 URL 만 알면 누구나 초안까지 읽었다
 *   ② 프로덕션 CSP 의 default-src 'self' 가 크로스오리진 호출을 막는다
 *
 * 이제 브라우저는 같은 오리진만 부르고, 세션 검증 후 서버가 서비스 토큰으로
 * NestJS 를 호출한다. NestJS 는 인터넷에서 직접 열리지 않는다.
 * (설계문서 3.6 "Next.js route handler = 얇은 BFF")
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET() {
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
    upstream = await fetch(`${UPSTREAM}/insights/admin`, {
      headers: {
        'x-service-token': token,
        // 감사 로그용. NestJS 가 "누구의 요청이었나"를 알 수 있어야 한다
        'x-acting-user': session.sub,
      },
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[bff] NestJS 호출 실패:', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 상류의 본문을 그대로 흘리지 않는다 — 내부 오류 메시지가 브라우저로 나간다
    console.error('[bff] NestJS 응답 %d', upstream.status)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  return NextResponse.json(await upstream.json())
}
