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

const REQUIRED_SCOPE = 'access_as_user';

const CLOCK_TOLERANCE_SEC = 60;

// jsonwebtoken 의 타입은 "비어 있지 않은 목록"을 튜플로 강제한다. string[] 는 안 받는다.
function issuersFor(tenantId: string): [string, ...string[]] {
  return [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];
}

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v1 은 aud 에 Application ID URI, v2 는 clientId(GUID) 를 준다 — 둘 다 허용한다
function audiencesFor(audience: string): [string, ...string[]] {
  const lastSegment = audience.split('/').pop() ?? '';
  return GUID_PATTERN.test(lastSegment) && lastSegment !== audience
    ? [audience, lastSegment]
    : [audience];
}

export interface EntraUser {
  tenantId: string;
  objectId: string;
  internalUserId: string;
  displayName?: string;
  preferredUsername?: string;
  preferredLanguage?: string;
}

export interface RequestWithEntraUser {
  headers: Record<string, unknown>;
  entraUser?: EntraUser;
}

@Injectable()
export class EntraAuthGuard implements CanActivate {
  private readonly logger = new Logger(EntraAuthGuard.name);

  private readonly jwksClients = new Map<string, JwksClient>();

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { allowedTenants, audience } = this.requireConfig();

    const request = context.switchToHttp().getRequest<RequestWithEntraUser>();
    const token = this.bearerToken(request.headers);

    // 검증 전 tid. 어느 테넌트 키로 서명을 확인할지 고르는 데만 쓴다
    const tenantId = this.peekTenantId(token);

    if (!allowedTenants.includes(tenantId)) {
      this.logger.warn(
        `허용되지 않은 테넌트의 토큰을 거부했습니다: tid=${tenantId}`,
      );
      throw new UnauthorizedException();
    }

    const payload = await this.verifySignature(token, tenantId, audience);

    this.requireScope(payload);

    const objectId = typeof payload.oid === 'string' ? payload.oid : '';
    if (!objectId) {
      // oid 가 없는 토큰은 사용자 토큰이 아니다 (앱 전용 토큰 등).
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
      preferredLanguage:
        typeof payload.xms_pl === 'string' && payload.xms_pl.trim()
          ? payload.xms_pl.trim().toLowerCase()
          : undefined,
    };

    return true;
  }

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

  private bearerToken(headers: Record<string, unknown>): string {
    const raw = headers['authorization'] ?? headers['Authorization'];
    // 배열로 온 헤더는 거부한다 (헤더 주입 방어) — ServiceTokenGuard 와 같은 태도
    if (typeof raw !== 'string') throw new UnauthorizedException();

    const [scheme, value] = raw.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value)
      throw new UnauthorizedException();

    return value;
  }

  private peekTenantId(token: string): string {
    let decoded: ReturnType<typeof decode>;
    try {
      decoded = decode(token, { json: true });
    } catch {
      throw new UnauthorizedException();
    }

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
          // 알고리즘을 고정하지 않으면 토큰이 스스로 고를 수 있다 (alg=none / HS256 혼동)
          algorithms: ['RS256'],
          audience: audiencesFor(audience),
          // tid 로 조립한다. 고정 문자열로 두면 두 번째 테넌트가 통째로 막힌다.
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
