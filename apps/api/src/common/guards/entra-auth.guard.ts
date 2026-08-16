/**
 * Entra ID 사용자 인증 — Teams 탭이 보낸 토큰이 우리 조직 사람의 것인가.
 *
 * `ServiceTokenGuard` 와 나란히 서지만 답하는 질문이 다르다:
 *   ServiceTokenGuard  "호출자가 우리 BFF 인가"       — 서비스 간 신뢰
 *   EntraAuthGuard     "이 사용자가 누구인가"          — 사용자 신원
 * Teams 경로는 둘 다 통과해야 한다 (docs/TEAMS_TAB_DESIGN.md 2장).
 *
 * ★ 테넌트가 둘이다 (에어키 / 지니). 그래서 발급자를 고정 문자열로 둘 수 없고,
 *   토큰이 말하는 `tid` 로 조립해야 한다. 여기에 함정이 있다 —
 *
 *     `aud` 는 "이 토큰이 우리 API 용인가"만 답한다.
 *     "발급한 조직이 우리 조직인가"는 답하지 않는다.
 *
 *   즉 `tid` 를 허용목록으로 확인하지 않으면 전 세계 아무 Microsoft 테넌트나
 *   우리 API 토큰을 받을 수 있다. 멀티테넌트 앱에서 가장 흔한 구멍이다 (3.2.1).
 *
 *   그래서 순서가 정해져 있다:
 *     ① 서명을 믿지 않고 디코드만 해서 `tid` 를 꺼낸다
 *     ② 허용목록에 있는지 본다 — 없으면 여기서 끝 (JWKS 를 부르지도 않는다)
 *     ③ 그 `tid` 로 JWKS URL 과 기대 `iss` 를 조립해 서명·발급자를 검증한다
 *
 *   ①의 값은 검증 전이므로 **라우팅에만** 쓴다. ③이 같은 `tid` 의 키로 서명을
 *   확인하므로, 위조된 `tid` 는 ③에서 서명 불일치로 떨어진다.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify, type JwtPayload } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/** Teams SSO 토큰이 반드시 갖고 있어야 하는 스코프. */
const REQUIRED_SCOPE = 'access_as_user';

/** 시계 오차 허용치(초). Entra 와 우리 서버의 시각이 완전히 같지는 않다. */
const CLOCK_TOLERANCE_SEC = 60;

/**
 * 한 테넌트가 낼 수 있는 발급자는 두 가지다. 앱이 v1 토큰을 받도록 설정돼 있으면
 * `sts.windows.net`, v2 면 `login.microsoftonline.com/.../v2.0` 이 온다
 * (`accessTokenAcceptedVersion`). 어느 쪽인지는 테넌트가 아니라 **Entra 앱 등록
 * 설정**이 정한다.
 *
 * ★ 한쪽만 기대하면 조용히 401 이 난다. 실제로 첫 배포에서 `jwt issuer invalid` 로
 *   막혔는데, 화면에는 "로그인이 만료되었습니다"로만 보여 원인이 드러나지 않았다.
 *
 * 둘 다 받아도 테넌트 격리는 그대로다 — 두 값 모두 **검증된 `tid` 로 조립**하므로
 * 다른 테넌트의 발급자는 여전히 통과하지 못한다.
 */
function issuersFor(tenantId: string): string[] {
  return [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];
}

/** Application ID URI 끝에 붙는 clientId 를 알아보기 위한 형식 검사. */
const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `aud` 도 토큰 버전에 따라 갈린다.
 *   v1 → Application ID URI (`api://genie.geniein.com/<clientId>`)
 *   v2 → 클라이언트 ID (GUID) 단독
 *
 * 설정값에서 clientId 를 유도해 둘 다 허용한다. 새 환경변수를 만들지 않는 편이
 * 값의 출처가 하나로 유지된다. 유도에 실패하면 설정값만 쓴다 — 조용히 넓어지지 않는다.
 */
function audiencesFor(audience: string): string[] {
  const lastSegment = audience.split('/').pop() ?? '';
  return GUID_PATTERN.test(lastSegment) && lastSegment !== audience
    ? [audience, lastSegment]
    : [audience];
}

/**
 * 서버가 확정한 호출자. 모델도, 클라이언트도 이 값을 지정할 수 없다 —
 * 오직 검증된 토큰에서만 나온다 (설계문서 원칙③과 같은 성격).
 */
export interface EntraUser {
  /** 테넌트 ID. 그대로 org_id 가 된다 — 에어키/지니를 가르는 유일한 값 */
  tenantId: string;
  /** 테넌트 안에서의 사용자 객체 ID */
  objectId: string;
  /** `{tid}:{oid}`. oid 는 테넌트 안에서만 유일하므로 단독으로 쓰지 않는다 (3.4) */
  internalUserId: string;
  displayName?: string;
  preferredUsername?: string;
}

export interface RequestWithEntraUser {
  headers: Record<string, unknown>;
  entraUser?: EntraUser;
}

@Injectable()
export class EntraAuthGuard implements CanActivate {
  private readonly logger = new Logger(EntraAuthGuard.name);

  /**
   * 테넌트마다 JWKS 클라이언트를 하나씩 만들어 재사용한다.
   *
   * jwks-rsa 가 키를 캐시하는 주체이므로, 요청마다 새로 만들면 캐시가 매번 비어
   * 토큰 검증 1회당 Microsoft 왕복이 1회 붙는다. 키 롤오버는 `cacheMaxAge` 만료로
   * 따라가고, 캐시에 없는 `kid` 가 오면 라이브러리가 알아서 다시 받아온다.
   *
   * 키가 허용목록 테넌트로 제한되므로(②) 이 맵이 무한히 자라지 않는다.
   */
  private readonly jwksClients = new Map<string, JwksClient>();

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { allowedTenants, audience } = this.requireConfig();

    const request = context.switchToHttp().getRequest<RequestWithEntraUser>();
    const token = this.bearerToken(request.headers);

    // ① 서명을 믿지 않고 tid 만 꺼낸다 — 라우팅용이다
    const tenantId = this.peekTenantId(token);

    // ② 허용목록 확인. 여기서 막으면 JWKS 를 부르지도 않는다
    if (!allowedTenants.includes(tenantId)) {
      this.logger.warn(
        `허용되지 않은 테넌트의 토큰을 거부했습니다: tid=${tenantId}`,
      );
      throw new UnauthorizedException();
    }

    // ③ 그 테넌트의 키로 서명·발급자·수신자를 검증한다
    const payload = await this.verifySignature(token, tenantId, audience);

    this.requireScope(payload);

    const objectId = typeof payload.oid === 'string' ? payload.oid : '';
    if (!objectId) {
      // oid 가 없는 토큰은 사용자 토큰이 아니다 (앱 전용 토큰 등).
      // 신원 없이 통과시키면 감사 로그가 무의미해진다.
      throw new UnauthorizedException();
    }

    request.entraUser = {
      tenantId,
      objectId,
      internalUserId: `${tenantId}:${objectId}`,
      displayName: typeof payload.name === 'string' ? payload.name : undefined,
      preferredUsername:
        typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : undefined,
    };

    return true;
  }

  // ── 설정 ────────────────────────────────────────────────────────────

  /**
   * 설정이 없으면 통과시키지 않는다. `ServiceTokenGuard` 와 같은 규칙이다 —
   * "설정 안 했으니 열어둔다"가 이 시스템이 원래 갖고 있던 문제였다.
   */
  private requireConfig(): { allowedTenants: string[]; audience: string } {
    const allowedTenants = (
      this.config.get<string>('ENTRA_ALLOWED_TENANTS') ?? ''
    )
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const audience = (
      this.config.get<string>('ENTRA_API_AUDIENCE') ?? ''
    ).trim();

    if (allowedTenants.length === 0 || !audience) {
      this.logger.error(
        'ENTRA_ALLOWED_TENANTS / ENTRA_API_AUDIENCE 가 설정되지 않아 Teams 엔드포인트를 차단합니다',
      );
      throw new ServiceUnavailableException('entra auth is not configured');
    }

    return { allowedTenants, audience };
  }

  // ── 토큰 ────────────────────────────────────────────────────────────

  private bearerToken(headers: Record<string, unknown>): string {
    const raw = headers['authorization'] ?? headers['Authorization'];
    // 배열로 온 헤더는 거부한다 (헤더 주입 방어) — ServiceTokenGuard 와 같은 태도
    if (typeof raw !== 'string') throw new UnauthorizedException();

    const [scheme, value] = raw.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value)
      throw new UnauthorizedException();

    return value;
  }

  /**
   * 검증 전 디코드. **이 값으로 인가 판단을 하지 않는다** — 어느 테넌트의 키로
   * 서명을 확인할지 고르는 데만 쓴다.
   */
  private peekTenantId(token: string): string {
    let decoded: ReturnType<typeof decode>;
    try {
      decoded = decode(token, { json: true });
    } catch {
      throw new UnauthorizedException();
    }

    // JwtPayload 는 인덱스 시그니처가 any 다. unknown 으로 받아 좁혀 쓴다 —
    // 검증 전 페이로드를 any 로 흘리면 타입 검사가 여기서부터 무의미해진다.
    const tid: unknown = decoded?.tid;
    if (typeof tid !== 'string' || !tid) throw new UnauthorizedException();

    return tid;
  }

  private jwksFor(tenantId: string): JwksClient {
    let client = this.jwksClients.get(tenantId);
    if (!client) {
      client = new JwksClient({
        jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 12 * 60 * 60 * 1000,
        // 키를 못 찾을 때마다 Microsoft 를 두들기지 않는다 — 잘못된 kid 를 반복해
        // 보내는 것만으로 우리가 외부 호출을 증폭시키면 안 된다.
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
      this.jwksClients.set(tenantId, client);
    }
    return client;
  }

  private async verifySignature(
    token: string,
    tenantId: string,
    audience: string,
  ): Promise<JwtPayload> {
    const client = this.jwksFor(tenantId);

    return new Promise<JwtPayload>((resolve, reject) => {
      verify(
        token,
        (header, callback) => {
          client
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((err: Error) => callback(err));
        },
        {
          // ★ 알고리즘을 고정한다. 지정하지 않으면 토큰이 스스로 알고리즘을 고를 수
          //   있게 되고, 그게 JWT 의 고전적인 취약점이다 (alg=none / HS256 혼동).
          algorithms: ['RS256'],
          // v1/v2 토큰 양쪽을 받는다 (audiencesFor / issuersFor 주석 참조)
          audience: audiencesFor(audience),
          // ★ 고정 문자열이 아니라 tid 로 조립한다. 고정하면 두 번째 테넌트가 통째로 막힌다.
          issuer: issuersFor(tenantId),
          clockTolerance: CLOCK_TOLERANCE_SEC,
        },
        (err, payload) => {
          if (err || !payload || typeof payload === 'string') {
            this.logger.warn(
              `토큰 검증 실패: ${err?.message ?? 'payload 형식 오류'}`,
            );
            reject(new UnauthorizedException());
            return;
          }
          resolve(payload);
        },
      );
    });
  }

  /**
   * `scp` 는 위임(사용자 대신) 토큰의 스코프다. 이게 없는 토큰은 앱 전용 토큰이며,
   * 사용자 신원을 담고 있지 않다. Teams SSO 가 주는 것은 언제나 위임 토큰이다.
   */
  private requireScope(payload: JwtPayload): void {
    const scp: unknown = payload.scp;
    // Entra 는 공백 구분 문자열로 주지만, 배열로 오는 구현도 있어 둘 다 받는다.
    const scopes: string[] =
      typeof scp === 'string'
        ? scp.split(' ')
        : Array.isArray(scp)
          ? (scp as unknown[]).filter((s): s is string => typeof s === 'string')
          : [];

    if (!scopes.includes(REQUIRED_SCOPE)) {
      this.logger.warn(
        `요구 스코프 누락: ${REQUIRED_SCOPE} (받은 값: ${JSON.stringify(scp)})`,
      );
      throw new UnauthorizedException();
    }
  }
}
