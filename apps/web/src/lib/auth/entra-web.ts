/**
 * Entra 웹 로그인 — 인가 코드 + PKCE. Teams 밖 브라우저에서 사람을 확인해야 하는 경로용.
 *
 * ★ id_token 서명은 검증하지 않는다. 토큰 엔드포인트에서 클라이언트 비밀로 직접 받은
 *   응답이므로 TLS 가 발급자를 보증한다 (OIDC Core 3.1.3.7 의 6). 브라우저를 거쳐 온
 *   토큰을 이 함수에 넣으면 그 전제가 깨진다.
 *
 * ★ 관리자 세션(`geniein_session`)과 쿠키를 나눈다. middleware 는 역할을 보지 않고
 *   세션만 보므로, 같은 쿠키를 쓰면 로드맵을 볼 수 있는 사람이 /admin 까지 통과한다.
 */

import { createHash, randomBytes } from 'node:crypto'

export const OAUTH_COOKIE = 'geniein_entra_oauth'
export const OAUTH_COOKIE_PATH = '/api/auth/entra'
export const ROADMAP_COOKIE = 'geniein_roadmap'
export const ROADMAP_ROLE = 'roadmap'
/**
 * 누가 볼 수 있는지는 Entra 가 정한다. 로드맵 전용 앱 등록에 이 앱 역할을 만들고
 * 사람에게 할당하면 id_token 의 `roles` 에 실린다. 할당되지 않은 사람의 토큰에는 없다.
 */
export const ROADMAP_APP_ROLE = 'Roadmap.Viewer'

export interface EntraWebConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  origin: string
}

export interface PendingLogin {
  state: string
  nonce: string
  verifier: string
}

export interface EntraIdentity {
  oid: string
  email: string
  name: string
  roles: string[]
}

export function entraWebConfig(): EntraWebConfig | null {
  const tenantId = process.env.ENTRA_TENANT_ID
  const clientId = process.env.ENTRA_WEB_CLIENT_ID
  const clientSecret = process.env.ENTRA_WEB_CLIENT_SECRET
  const origin = process.env.PUBLIC_ORIGIN
  if (!tenantId || !clientId || !clientSecret || !origin) return null
  return { tenantId, clientId, clientSecret, origin: origin.replace(/\/$/, '') }
}

// nginx 뒤에서는 request.url 의 호스트가 127.0.0.1:3100 이다. 돌아갈 주소는 설정값으로 만든다
const redirectUri = (config: EntraWebConfig) => `${config.origin}${OAUTH_COOKIE_PATH}/callback`

const random = (bytes: number) => randomBytes(bytes).toString('base64url')

export function startLogin(config: EntraWebConfig): { url: URL; pending: PendingLogin } {
  const pending = { state: random(24), nonce: random(24), verifier: random(48) }
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`)
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(config),
    response_mode: 'query',
    scope: 'openid profile email',
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString()
  return { url, pending }
}

export async function finishLogin(
  config: EntraWebConfig,
  code: string,
  pending: PendingLogin,
): Promise<EntraIdentity | null> {
  let response: Response
  try {
    response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(config),
        code_verifier: pending.verifier,
        scope: 'openid profile email',
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    console.error('[entra] 토큰 엔드포인트 연결 실패:', error)
    return null
  }

  if (!response.ok) {
    console.error('[entra] 토큰 교환 실패:', response.status, await response.text().catch(() => ''))
    return null
  }

  let claims: Record<string, unknown>
  try {
    const { id_token: idToken } = (await response.json()) as { id_token?: string }
    claims = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'))
  } catch {
    console.error('[entra] id_token 을 읽지 못했습니다')
    return null
  }

  if (claims.aud !== config.clientId || claims.tid !== config.tenantId || claims.nonce !== pending.nonce) {
    console.error('[entra] id_token 클레임 불일치')
    return null
  }
  if (typeof claims.oid !== 'string') return null

  const email = String(claims.preferred_username ?? claims.email ?? '').toLowerCase()
  const roles = Array.isArray(claims.roles) ? claims.roles.filter((role): role is string => typeof role === 'string') : []
  return { oid: claims.oid, email, name: String(claims.name ?? email), roles }
}
