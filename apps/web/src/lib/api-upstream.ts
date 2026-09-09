/**
 * 서버 → NestJS 내부 주소를 한 곳에서 정한다.
 *
 * ★ 반드시 절대 URL 이어야 한다. Node 의 fetch 는 상대 경로를 받지 못하고
 *   그냥 던진다.
 *
 *   실제로 이 사고가 있었다. `NEXT_PUBLIC_API_URL` 이 "/api" 로 빌드에
 *   박혀 있어서 `${UPSTREAM}/careers/admin` 이 "/api/careers/admin" 이
 *   됐고, fetch 가 ERR_INVALID_URL 로 터졌다. 그런데 BFF 의 catch 가 그걸
 *   `upstream_unreachable`(502) 로 뭉개서 브라우저에는 "공고를 불러오지
 *   못했습니다" 만 보였다. 원인이 안 보이는 상태로 어드민 채용 화면이
 *   죽어 있었고, pm2 에러 로그에 24회 / unhandledRejection 61건이 쌓였다.
 *
 *   `NEXT_PUBLIC_` 접두어가 붙은 값은 Next 가 빌드 시점에 문자열로
 *   박아버리므로 런타임에 지울 수도 없다. 그래서 읽는 자리에서 한 번
 *   걸러낸다 — 상대 경로면 폴백으로 바꾸고 이유를 로그에 남긴다.
 *   조용히 502 로 뭉개지는 것보다 낫다.
 */

/** 같은 호스트의 NestJS. localhost 가 아니라 127.0.0.1 인 이유는
 *  Node 가 localhost 를 IPv6(::1) 로 먼저 풀 수 있기 때문이다. */
const FALLBACK = 'http://127.0.0.1:3001'

let cached: string | null = null

/** 절대 URL 로 보장된 내부 API 주소. 처음 부를 때 한 번만 판정한다. */
export function apiUpstream(): string {
  if (cached) return cached

  const raw = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || FALLBACK
  /* 끝 슬래시를 떼지 않으면 `${UPSTREAM}/careers` 가 "//careers" 가 된다. */
  const value = raw.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(value)) {
    cached = value
    return cached
  }

  console.error(
    '[upstream] 내부 API 주소가 절대 URL 이 아닙니다: %o — %s 로 대체합니다. ' +
      'API_INTERNAL_URL 을 http://127.0.0.1:3001 형태로 설정하세요. ' +
      'NEXT_PUBLIC_API_URL 에 "/api" 같은 상대 경로를 넣으면 빌드에 박혀 서버 fetch 가 터집니다.',
    raw,
    FALLBACK,
  )
  cached = FALLBACK
  return cached
}
