/**
 * 로그인 시도 제한 — 프로세스 메모리 기반.
 *
 * ⚠ 정직하게: 인스턴스 단위다. 배포하면 초기화되고 여러 인스턴스로 늘리면
 *   각자 따로 센다. 자격증명이 하나뿐인 현 단계에서 무차별 대입의 속도를
 *   떨어뜨리는 용도이지, 분산 환경의 방어선이 아니다.
 *   다중 인스턴스로 가면 Redis 또는 리버스 프록시 레벨로 올려야 한다.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function sweep(now: number) {
  // 요청마다 전체 순회. 관리자 로그인 빈도에서는 무시 가능한 비용이고,
  // 만료 항목이 영원히 남는 것보다 낫다.
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function consumeLoginAttempt(key: string): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

/** 로그인에 성공하면 카운터를 비운다 */
export function resetLoginAttempts(key: string) {
  buckets.delete(key)
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
