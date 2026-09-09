/**
 * 대화 화면 미리보기 — **개발 전용.**
 *
 * 탭 본체(/teams/search)는 Teams SSO 없이는 아무것도 못 한다. 그래서 디자인을 보려면
 * 매번 배포하고 Teams 에서 열어야 하는데, 그 왕복이 UI 작업을 사실상 막는다.
 *
 * ★ 인증 우회를 만들지 않는다. 그건 "설정 안 했으니 열어둔다"와 같은 종류의 구멍이고,
 *   이 저장소가 반복해서 닫아 온 것이다. 대신 **같은 ChatView 를 캔에 담긴 대화로**
 *   렌더한다. 네트워크도 토큰도 관여하지 않으므로 우회할 경로 자체가 없다.
 *
 * 운영 빌드에서는 존재하지 않는다 (아래 notFound).
 */

import { notFound } from 'next/navigation'
import { PreviewClient } from './preview-client'

export default function TeamsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <PreviewClient />
}
