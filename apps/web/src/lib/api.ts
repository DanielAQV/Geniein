/** 공개 API. 브라우저가 NestJS 를 직접 부르는 경로 — 공개 인사이트에만 쓴다. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const fetcher = (url: string) => fetch(`${API_BASE_URL}${url}`).then((res) => res.json());

/**
 * 관리자 API. 같은 오리진의 BFF(/api/admin/*)만 부른다.
 *
 * 관리자 데이터를 `fetcher` 로 부르면 안 된다 — 크로스오리진이라 세션 쿠키가
 * 실리지 않고, 프로덕션 CSP 의 default-src 'self' 에도 막힌다.
 */
export const adminFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw Object.assign(new Error(`요청 실패 (${res.status})`), { status: res.status });
  }
  return res.json();
};
