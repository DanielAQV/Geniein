import { NextResponse, type NextRequest } from 'next/server'
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  ROADMAP_COOKIE,
  ROADMAP_APP_ROLE,
  ROADMAP_ROLE,
  entraWebConfig,
  finishLogin,
  type PendingLogin,
} from '@/lib/auth/entra-web'
import { SESSION_TTL_SECONDS, createSessionToken, sessionCookieOptions } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MESSAGES = {
  retry: '로그인을 마치지 못했습니다. 다시 시도해 주세요.',
  denied: '이 페이지를 볼 수 있는 계정이 아닙니다.',
} as const

function stop(status: number, message: string) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Geniein</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#09090b;color:#e9e6df;font-family:system-ui,sans-serif">
<div style="text-align:center;padding:24px"><p style="margin:0 0 16px">${message}</p><a href="/roadmap" style="color:#e6c483">다시 로그인</a></div></body></html>`
  const response = new NextResponse(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
  response.cookies.set(OAUTH_COOKIE, '', { ...sessionCookieOptions(0), path: OAUTH_COOKIE_PATH })
  return response
}

export async function GET(request: NextRequest) {
  const config = entraWebConfig()
  if (!config) return new NextResponse('로그인 설정이 아직 없습니다.', { status: 503 })

  const params = request.nextUrl.searchParams
  let pending: PendingLogin | null = null
  try {
    pending = JSON.parse(Buffer.from(request.cookies.get(OAUTH_COOKIE)?.value ?? '', 'base64url').toString('utf8'))
  } catch {
    pending = null
  }

  const code = params.get('code')
  if (!pending || !code || params.get('state') !== pending.state) {
    if (params.get('error')) console.warn('[entra] 로그인 취소/오류:', params.get('error'), params.get('error_description'))
    return stop(400, MESSAGES.retry)
  }

  const identity = await finishLogin(config, code, pending)
  if (!identity) return stop(401, MESSAGES.retry)

  if (!identity.roles.includes(ROADMAP_APP_ROLE)) {
    console.warn('[entra] 로드맵 역할이 할당되지 않은 계정:', identity.email)
    return stop(403, MESSAGES.denied)
  }

  const token = await createSessionToken({ sub: identity.oid, name: identity.name, roles: [ROADMAP_ROLE] })
  const response = NextResponse.redirect(`${config.origin}/roadmap`)
  response.cookies.set(ROADMAP_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS))
  response.cookies.set(OAUTH_COOKIE, '', { ...sessionCookieOptions(0), path: OAUTH_COOKIE_PATH })
  return response
}
