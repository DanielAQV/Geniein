/** 공개 API. 브라우저가 NestJS 를 직접 부르는 경로 — 공개 인사이트에만 쓴다. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const fetcher = (url: string) => fetch(`${API_BASE_URL}${url}`).then((res) => res.json());

export const adminFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw Object.assign(new Error(`요청 실패 (${res.status})`), { status: res.status });
  }
  return res.json();
};
