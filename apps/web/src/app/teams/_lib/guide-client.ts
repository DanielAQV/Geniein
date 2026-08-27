/**
 * 가이드 API 호출 — 탭이 브라우저에서 부르는 것은 같은 오리진의 `/api/teams/guide*`
 * 뿐이다. 토큰을 얻는 방법도 대화 화면과 같다 (lib/teams/client).
 */

import { getTeamsToken } from '@/lib/teams/client'

export class GuideAuthError extends Error {}
export class GuideNotFoundError extends Error {}

export async function fetchGuide<T>(path: string): Promise<T> {
  const token = await getTeamsToken()
  const response = await fetch(`/api/teams/guide${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (response.status === 401) throw new GuideAuthError('토큰이 만료되었습니다')
  if (response.status === 404) throw new GuideNotFoundError('문서를 찾을 수 없습니다')
  if (!response.ok) throw new Error(`가이드를 불러오지 못했습니다 (${response.status})`)

  return (await response.json()) as T
}
