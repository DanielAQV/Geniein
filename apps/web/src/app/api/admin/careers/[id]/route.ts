/**
 * 관리자 채용 공고 BFF — 단건 조회 / 수정 / 삭제.
 */

import { NextResponse } from 'next/server'
import { forwardToAdminApi, readJsonBody } from '@/lib/admin/upstream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

/** 경로 파라미터를 그대로 상류 URL 에 붙이지 않는다 — 경로 조작을 막는다. */
function safeId(id: string): string | null {
  return /^[0-9a-fA-F-]{36}$/.test(id) ? id : null
}

export async function GET(_request: Request, { params }: Context) {
  const id = safeId((await params).id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  return forwardToAdminApi(`/careers/admin/${id}`)
}

export async function PATCH(request: Request, { params }: Context) {
  const id = safeId((await params).id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const body = await readJsonBody(request)
  if (body === null) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  return forwardToAdminApi(`/careers/admin/${id}`, { method: 'PATCH', body })
}

export async function DELETE(_request: Request, { params }: Context) {
  const id = safeId((await params).id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  return forwardToAdminApi(`/careers/admin/${id}`, { method: 'DELETE' })
}
