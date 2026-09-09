/**
 * 관리자 채용 공고 BFF — 목록 / 생성.
 *
 * 브라우저는 같은 오리진(/api/admin/careers)만 부르고, 세션 검증 후 서버가
 * 서비스 토큰으로 NestJS 를 호출한다. NestJS 는 인터넷에서 직접 열리지 않는다.
 * (insights BFF 와 같은 구조 — 공통 부분은 lib/admin/upstream.ts 에 있다)
 */

import { NextResponse } from 'next/server'
import { forwardToAdminApi, readJsonBody } from '@/lib/admin/upstream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return forwardToAdminApi('/careers/admin')
}

export async function POST(request: Request) {
  const body = await readJsonBody(request)
  if (body === null) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  // 필드 검증은 NestJS 가 한다. BFF 에서 한 번 더 하면 규칙이 두 벌이 되고
  // 언젠가 둘이 어긋난다 — 신뢰 경계는 상류다.
  return forwardToAdminApi('/careers/admin', { method: 'POST', body })
}
