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

// Microsoft 문서의 frame-ancestor 표. `*.cloud.microsoft` 가 없으면 새 Teams
// 클라이언트에서 탭이 "refused to connect" 로 뜬다 (`*.microsoft.com` 으로 안 덮인다).
const TEAMS_FRAME_ANCESTORS = [
  'https://*.cloud.microsoft', // 전 호스트 (신규 도메인)
  'https://teams.microsoft.com', // Teams
  'https://*.teams.microsoft.com',
  'https://*.microsoft365.com', // Microsoft 365 앱
  'https://*.office.com',
  'https://*.skype.com', // 구 Teams 클라이언트 (하위 호환)
].join(' ');

function contentSecurityPolicy(frameAncestors) {
  // connect-src 가 없으면 default-src 'self' 로 제한된다. NEXT_PUBLIC_API_URL 이
  // 다른 오리진이면 그 값을 넣어야 공개 인사이트 호출이 산다.
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

// 터널로 dev 서버를 노출하면 `/_next/*` 가 교차 오리진으로 차단돼 하이드레이션이
// 통째로 안 일어난다 — 화면은 그려지는데 버튼이 영원히 disabled 로 남는다.
const devTunnelHost = process.env.DEV_TUNNEL_HOST?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.devtunnels.ms',
    '*.ngrok-free.app',
    ...(devTunnelHost ? [devTunnelHost] : []),
  ],
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
        // `/teams` 와 그 하위를 제외한 전 경로. `(?:/|$)` 가 있어야 `/teamsomething` 이 안 샌다.
        source: '/((?!teams(?:/|$)).*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy("'self'") },
        ],
      },
      {
        // Teams 탭. X-Frame-Options 는 소스 목록을 못 받아 완화할 방법이 없다 —
        // 헤더 자체를 안 내보내야 하므로 위 블록의 source 에서 /teams 를 뺐다.
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
