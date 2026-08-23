
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

const LOGIN_PATH = '/admin/login'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  // BFF 라우트는 리다이렉트가 아니라 401 이어야 한다 — 로그인 HTML 을 JSON 으로 파싱하게 된다.
  if (pathname.startsWith('/api/admin')) {
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL('/admin/insights', request.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    // 로그인 후 원래 가려던 곳으로. 경로만 넘긴다 — 절대 URL 을 받으면 오픈 리다이렉트가 된다
    loginUrl.searchParams.set('from', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
