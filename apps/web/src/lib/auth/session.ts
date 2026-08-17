/**
 * 세션 토큰 — HMAC 서명 쿠키.
 *
 * ★ 이 파일이 "신원 발급자" 경계다. Entra ID SSO 로 갈아끼울 때
 *   바뀌는 것은 `createSession` 을 부르는 쪽(누가 신원을 증명했는가)이고,
 *   `verifySession` 을 쓰는 쪽(middleware / BFF)은 그대로 둔다.
 *
 * Web Crypto 만 쓴다 — middleware 는 Edge 런타임이라 node:crypto 를 못 쓴다.
 * 여기서 비밀번호를 다루지 않는 이유도 같다 (그건 credentials.ts, Node 전용).
 */

export const SESSION_COOKIE = 'geniein_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8시간

export interface SessionPayload {
  /** 내부 사용자 식별자. Entra 전환 시 AAD object id 가 들어온다 */
  sub: string
  name: string
  roles: string[]
  /** 발급 시각 (epoch seconds) */
  iat: number
  /** 만료 시각 (epoch seconds) */
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

let cachedKey: Promise<CryptoKey> | null = null

function signingKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const secret = process.env.AUTH_SECRET
  // 기본값을 두지 않는다. 비밀이 없으면 세션을 발급하지도 검증하지도 않는다 —
  // 약한 기본 키로 조용히 동작하는 것이 최악이다.
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET 이 없거나 너무 짧습니다 (32자 이상 필요). ' +
        '`openssl rand -base64 48` 로 생성해 .env 에 넣으세요.',
    )
  }

  cachedKey = crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  return cachedKey
}

/** 서명된 세션 토큰을 만든다. `payload.body` + '.' + `signature` */
export async function createSessionToken(
  identity: Pick<SessionPayload, 'sub' | 'name' | 'roles'>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    ...identity,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

/**
 * 토큰을 검증한다. 위조·만료·형식 오류는 전부 null 이다.
 * 호출부가 실패 사유별로 분기할 일이 없고, 분기하면 오라클이 된다.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null

  const separator = token.indexOf('.')
  if (separator < 1) return null

  const body = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    )
  } catch {
    return null
  }
  if (!valid) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(body)))
  } catch {
    return null
  }

  if (typeof payload?.sub !== 'string' || typeof payload?.exp !== 'number') return null
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null

  return payload
}

/** 쿠키 옵션. 한 곳에서만 정의한다 — 로그인과 로그아웃이 어긋나면 쿠키가 안 지워진다. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true, // JS 에서 못 읽는다. localStorage 인증이 무너진 지점이 여기였다
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}
