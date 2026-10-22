import { NextResponse } from 'next/server'
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH, entraWebConfig, startLogin } from '@/lib/auth/entra-web'
import { sessionCookieOptions } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const config = entraWebConfig()
  if (!config) {
    console.error('[entra] 웹 로그인 설정 누락 (ENTRA_TENANT_ID / ENTRA_WEB_CLIENT_ID / ENTRA_WEB_CLIENT_SECRET / PUBLIC_ORIGIN)')
    return new NextResponse('로그인 설정이 아직 없습니다.', { status: 503 })
  }

  const { url, pending } = startLogin(config)
  const response = NextResponse.redirect(url)
  response.cookies.set(OAUTH_COOKIE, Buffer.from(JSON.stringify(pending)).toString('base64url'), {
    ...sessionCookieOptions(600),
    path: OAUTH_COOKIE_PATH,
  })
  return response
}
