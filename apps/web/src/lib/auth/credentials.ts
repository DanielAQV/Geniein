
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

/** `scrypt$N$r$p$salt$hash` — 파라미터를 같이 저장해야 나중에 세게 올릴 수 있다 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)
  const { N, r, p } = SCRYPT_PARAMS
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  if (salt.length === 0 || expected.length === 0) return false

  let derived: Buffer
  try {
    derived = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_PARAMS.maxmem,
    })
  } catch {
    return false
  }

  return timingSafeEqual(derived, expected)
}

const DUMMY_HASH = hashPassword(randomBytes(24).toString('hex'))

export interface AdminIdentity {
  sub: string
  name: string
  roles: string[]
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): AdminIdentity | null {
  const expectedUser = process.env.ADMIN_USERNAME
  const expectedHash = process.env.ADMIN_PASSWORD_HASH

  if (!expectedUser || !expectedHash) {
    // 설정이 없으면 로그인은 항상 실패한다. 기본 계정을 만들어주지 않는다.
    throw new Error(
      'ADMIN_USERNAME / ADMIN_PASSWORD_HASH 가 설정되지 않았습니다. ' +
        'apps/web/scripts/hash-password.mjs 로 해시를 생성해 .env 에 넣으세요.',
    )
  }

  const userMatches =
    username.length === expectedUser.length &&
    timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser))

  const passwordMatches = verifyPassword(password, userMatches ? expectedHash : DUMMY_HASH)

  if (!userMatches || !passwordMatches) return null

  return { sub: `local:${expectedUser}`, name: expectedUser, roles: ['admin'] }
}
