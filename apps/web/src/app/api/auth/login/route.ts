/**
 * 로그인 — 자격증명은 서버에서만 검증된다.
 *
 * 이전에는 admin/login/page.tsx 안에서 문자열 비교를 했다.
 * 클라이언트 컴포넌트이므로 그 비교식이 JS 번들에 그대로 실려 배포됐다.
 * 이제 브라우저는 아이디/비밀번호를 보낼 뿐 정답을 받지 못한다.
 */

import { NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/auth/credentials'
import { clientKey, consumeLoginAttempt, resetLoginAttempts } from '@/lib/auth/rate-limit'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/auth/session'

// scrypt(node:crypto)를 쓰므로 Edge 가 아니라 Node 런타임이어야 한다
export const runtime = 'nodejs'

const INVALID = { error: 'invalid_credentials' as const }

export async function POST(request: Request) {
  const key = clientKey(request.headers)
  const limit = consumeLoginAttempt(key)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'too_many_attempts', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let username: unknown
  let password: unknown
  try {
    const body = await request.json()
    username = body?.username
    password = body?.password
  } catch {
    return NextResponse.json(INVALID, { status: 401 })
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json(INVALID, { status: 401 })
  }
  // 상한만 둔다. scrypt 에 임의 길이 입력을 그대로 넘기지 않는다
  if (username.length > 256 || password.length > 1024) {
    return NextResponse.json(INVALID, { status: 401 })
  }

  let identity: ReturnType<typeof verifyAdminCredentials>
  try {
    identity = verifyAdminCredentials(username, password)
  } catch (error) {
    // 설정 누락. 사용자에게 원인을 흘리지 않고 서버 로그에만 남긴다
    console.error('[auth] 로그인 설정 오류:', error)
    return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 })
  }

  if (!identity) {
    return NextResponse.json(INVALID, { status: 401 })
  }

  let token: string
  try {
    token = await createSessionToken(identity)
  } catch (error) {
    console.error('[auth] 세션 발급 실패:', error)
    return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 })
  }

  resetLoginAttempts(key)

  const response = NextResponse.json({ ok: true, name: identity.name })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS))
  return response
}
