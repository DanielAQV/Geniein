
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

/**
 * `scrypt:N:r:p:salt:hash` — 파라미터를 같이 저장해야 나중에 세게 올릴 수 있다.
 *
 * 구분자가 `:` 인 이유: dotenv 는 .env 값의 `$` 를 변수 참조로 보고 펼친다.
 * 예전 `$` 형식을 넣으면 `scrypt$16384$...` 가 `scrypt6384` 로 잘려 들어와
 * 비밀번호가 맞아도 로그인이 실패한다. 읽기는 두 형식 다 받는다.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)
  const { N, r, p } = SCRYPT_PARAMS
  return `scrypt:${N}:${r}:${p}:${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(stored.startsWith('scrypt:') ? ':' : '$')
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

/** 길이가 달라도 비교 시간이 입력에 따라 갈리지 않게 한다. */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    // 길이가 다르면 결과는 이미 정해졌지만, 비교는 그대로 한 번 돌린다.
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): AdminIdentity | null {
  const expectedUser = process.env.ADMIN_USERNAME
  const expectedHash = process.env.ADMIN_PASSWORD_HASH
  const expectedPlain = process.env.ADMIN_PASSWORD

  if (!expectedUser || (!expectedHash && !expectedPlain)) {
    // 설정이 없으면 로그인은 항상 실패한다. 기본 계정을 만들어주지 않는다.
    throw new Error(
      'ADMIN_USERNAME 과 ADMIN_PASSWORD 또는 ADMIN_PASSWORD_HASH 가 설정되지 않았습니다. ' +
        'apps/web/scripts/hash-password.mjs 로 해시를 생성해 .env 에 넣거나, ' +
        'ADMIN_PASSWORD 에 평문을 넣으세요.',
    )
  }

  const userMatches = constantTimeEquals(username, expectedUser)

  // ADMIN_PASSWORD 가 있으면 평문으로 비교한다. 서버 env 파일을 읽을 수 있는
  // 사람이 곧 관리자가 된다는 뜻이다 — 로그·백업·docker inspect 에도 실린다.
  // 해시로 돌아갈 때는 이 값을 지우기만 하면 된다.
  const passwordMatches = expectedPlain
    ? constantTimeEquals(password, expectedPlain)
    : verifyPassword(password, userMatches ? expectedHash! : DUMMY_HASH)

  if (!userMatches || !passwordMatches) return null

  return { sub: `local:${expectedUser}`, name: expectedUser, roles: ['admin'] }
}
