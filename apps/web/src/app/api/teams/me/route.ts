
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const UPSTREAM_TIMEOUT_MS = 10_000

export async function GET(request: Request) {
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
      headers: {
        Authorization: authorization,
        'x-service-token': serviceToken,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[bff] NestJS 호출 실패(me):', error)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 401 만 그대로 넘긴다 — 토큰이 만료됐다는 뜻이라 화면이 새로고침을 안내해야 한다.
    const status = upstream.status === 401 ? 401 : 502
    return NextResponse.json({ error: 'upstream_error' }, { status })
  }

  const body = (await upstream.json()) as { language?: unknown }
  return NextResponse.json({
    language: typeof body.language === 'string' ? body.language : null,
  })
}
