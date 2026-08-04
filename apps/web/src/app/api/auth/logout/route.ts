/**
 * 로그아웃 — 쿠키를 서버가 지운다.
 *
 * httpOnly 쿠키는 클라이언트 JS 가 지울 수 없다. 이전 구조의
 * `localStorage.removeItem` 에 대응하는 자리가 여기다.
 */

import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
