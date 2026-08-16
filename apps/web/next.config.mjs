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
const isProd = process.env.NODE_ENV === 'production';

/**
 * `/teams/*` 는 Teams 클라이언트가 iframe 으로 띄운다. 나머지 경로와 프레임
 * 정책이 정반대라 헤더 블록을 둘로 나눈다.
 *
 * ★ `X-Frame-Options` 는 소스 목록을 받지 못한다 — `SAMEORIGIN` 을 완화할 방법이
 *   없고, 값을 덮어써서 지울 수도 없다. **헤더 자체를 안 내보내는 것**이 유일한
 *   방법이므로, 일반 블록의 `source` 에서 `/teams` 를 빼야 한다. `/teams` 블록을
 *   뒤에 두고 덮어쓰는 방식은 통하지 않는다.
 *
 *   Teams 는 이 헤더가 남아 있으면 iframe 을 **백지로** 띄운다. 콘솔 오류 말고는
 *   아무 신호가 없어서 앱 버그로 오인하기 쉽다.
 */
/**
 * Microsoft 문서의 호스트별 frame-ancestor 표를 그대로 옮긴 것이다.
 * (Teams 문서: "Requirements for Building Tabs" → Content Security Policy)
 *
 * ★ `*.cloud.microsoft` 가 핵심이다. Teams 웹·데스크톱을 포함한 Microsoft 클라우드
 *   서비스가 이 도메인으로 이전 중이라, 없으면 새 클라이언트에서 탭이 **"refused to
 *   connect"** 로 뜬다. `*.microsoft.com` 으로는 안 덮인다 — `cloud.microsoft` 는
 *   다른 도메인이다. (처음에 그렇게 잘못 적어서 실제로 이 증상을 봤다.)
 *
 * Outlook 에서도 열 계획이 생기면 아래를 추가한다:
 *   outlook.office.com, outlook.office365.com,
 *   outlook-sdf.office.com, outlook-sdf.office365.com
 */
const TEAMS_FRAME_ANCESTORS = [
  'https://*.cloud.microsoft', // 전 호스트 (신규 도메인)
  'https://teams.microsoft.com', // Teams
  'https://*.teams.microsoft.com',
  'https://*.microsoft365.com', // Microsoft 365 앱
  'https://*.office.com',
  'https://*.skype.com', // 구 Teams 클라이언트 (하위 호환)
].join(' ');

/**
 * CSP 는 `frame-ancestors` 하나만 경로별로 다르다. 두 벌을 따로 적어두면 한쪽만
 * 고치는 사고가 나므로 조립해서 쓴다.
 */
function contentSecurityPolicy(frameAncestors) {
  // connect-src 가 없으면 default-src 'self' 가 적용돼 fetch/SSE 가 같은 오리진으로 제한된다.
  // 관리자 데이터와 Teams 검색은 BFF(/api/*)를 타므로 'self' 로 충분하다 —
  // NEXT_PUBLIC_API_URL 이 다른 오리진이면 그 값을 여기 추가해야 공개 인사이트 호출이 산다.
  const directives = isProd
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https://flagcdn.com",
        "font-src 'self'",
        `connect-src 'self'${publicApiOrigin ? ` ${publicApiOrigin}` : ''}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        `frame-ancestors ${frameAncestors}`,
        "frame-src 'self' https://www.google.com",
        'upgrade-insecure-requests',
      ]
    : [
        "default-src 'self' https://mcp.figma.com",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mcp.figma.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https://flagcdn.com https://mcp.figma.com",
        "font-src 'self' data:",
        "connect-src 'self' https://mcp.figma.com ws: wss:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        `frame-ancestors ${frameAncestors}`,
        "frame-src 'self' https://www.google.com",
      ];

  return `${directives.join('; ')};`;
}

/** 프레임 정책과 무관한 공통 헤더. 두 블록이 같은 값을 쓴다. */
const BASE_SECURITY_HEADERS = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

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
        // `/teams` 와 그 하위를 제외한 전 경로. `(?:/|$)` 가 있어야 `/teamsomething`
        // 같은 무관한 경로까지 예외로 새지 않는다.
        source: '/((?!teams(?:/|$)).*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy("'self'") },
        ],
      },
      {
        // Teams 탭. X-Frame-Options 를 **넣지 않는다** (위 주석 참조).
        source: '/teams/:path*',
        headers: [
          ...BASE_SECURITY_HEADERS,
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(TEAMS_FRAME_ANCESTORS),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
