
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET() {
  // middleware 가 이미 막지만 여기서도 확인한다. matcher 를 잘못 건드리면 조용히 열린다.
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
