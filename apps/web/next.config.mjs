/**
 * 공개 API 가 다른 오리진에 있으면 CSP 의 connect-src 에 그 오리진을 넣어야 한다.
 * 경로·쿼리는 CSP 소스가 아니므로 오리진만 뽑는다. 잘못된 값이면 조용히 무시한다 —
 * 여기서 던지면 빌드가 죽는다.
 */
function resolvePublicApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

const publicApiOrigin = resolvePublicApiOrigin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              // connect-src 가 없으면 default-src 'self' 가 적용돼 fetch/SSE 가 같은 오리진으로 제한된다.
              // 관리자 데이터는 BFF(/api/admin/*)를 타므로 'self' 로 충분하다 —
              // NEXT_PUBLIC_API_URL 이 다른 오리진이면 그 값을 여기 추가해야 공개 인사이트 호출이 산다.
              ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://flagcdn.com; font-src 'self'; connect-src 'self'${publicApiOrigin ? ` ${publicApiOrigin}` : ''}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; frame-src 'self' https://www.google.com; upgrade-insecure-requests;`
              : "default-src 'self' https://mcp.figma.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mcp.figma.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://flagcdn.com https://mcp.figma.com; font-src 'self' data:; connect-src 'self' https://mcp.figma.com ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; frame-src 'self' https://www.google.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
