/**
 * 서명 검증은 **진짜로** 돌린다. 테스트 안에서 RSA 키쌍을 만들어 토큰에 서명하고,
 * JWKS 조회(= 네트워크)만 목으로 막는다. 그래야 "위조 토큰이 떨어지는가"를
 * 실제 암호 연산으로 확인하게 된다 — 검증기를 통째로 목으로 두면 이 파일이
 * 확인하는 것이 아무것도 없어진다.
 */

import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { sign } from 'jsonwebtoken';
import { EntraAuthGuard, type RequestWithEntraUser } from './entra-auth.guard';

const mockGetSigningKey = jest.fn();
const mockJwksOptions = jest.fn();

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn().mockImplementation((options: unknown) => {
    mockJwksOptions(options);
    return { getSigningKey: mockGetSigningKey };
  }),
}));

// ── 고정값 ────────────────────────────────────────────────────────────

const TENANT_A = 'b81a7702-1111-2222-3333-444455556666'; // 에어키 자리
const TENANT_B = '3685a694-aaaa-bbbb-cccc-ddddeeeeffff'; // 지니 자리
const OUTSIDER = '99999999-9999-9999-9999-999999999999'; // 남의 테넌트
const AUDIENCE = 'api://genie.geniein.com/62a46191-3dcb-406e-a779-7411bf059611';
const OID = '0a1b2c3d-4e5f-6789-abcd-ef0123456789';

const issuerOf = (tid: string) =>
  `https://login.microsoftonline.com/${tid}/v2.0`;

/** v1 토큰의 발급자. Entra 앱이 v1 을 받도록 설정돼 있으면 이쪽이 온다. */
const v1IssuerOf = (tid: string) => `https://sts.windows.net/${tid}/`;

/** AUDIENCE 끝의 clientId. v2 토큰은 `aud` 에 이것만 담아 보낸다. */
const CLIENT_ID = '62a46191-3dcb-406e-a779-7411bf059611';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
// 공격자의 키. 형식은 완전히 정상이고 서명만 우리 것이 아니다.
const forged = generateKeyPairSync('rsa', { modulusLength: 2048 });

const pem = (key: typeof publicKey) =>
  key.export({ type: 'spki', format: 'pem' }).toString();

// ── 헬퍼 ──────────────────────────────────────────────────────────────

interface TokenOverrides {
  tid?: string;
  iss?: string;
  aud?: string;
  oid?: string | undefined;
  scp?: string | undefined;
  expiresIn?: string | number;
  key?: Parameters<typeof sign>[1];
  algorithm?: 'RS256' | 'HS256' | 'none';
}

function token(over: TokenOverrides = {}): string {
  const tid = over.tid ?? TENANT_A;
  const payload: Record<string, unknown> = {
    tid,
    iss: over.iss ?? issuerOf(tid),
    aud: over.aud ?? AUDIENCE,
    name: '김대리',
    preferred_username: 'daeri@geniein.com',
  };
  if (over.oid !== undefined) payload.oid = over.oid;
  if (over.scp !== undefined) payload.scp = over.scp;

  const algorithm = over.algorithm ?? 'RS256';
  return sign(payload, over.key ?? (algorithm === 'RS256' ? privateKey : ''), {
    algorithm,
    keyid: 'test-kid',
    expiresIn: over.expiresIn ?? '10m',
  } as Parameters<typeof sign>[2]);
}

/** oid 와 scp 가 정상으로 들어간 평범한 토큰. */
const goodToken = (over: TokenOverrides = {}) =>
  token({ oid: OID, scp: 'access_as_user', ...over });

function contextWith(headers: Record<string, unknown>): {
  ctx: ExecutionContext;
  request: RequestWithEntraUser;
} {
  const request: RequestWithEntraUser = { headers };
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
    request,
  };
}

function guardWith(env: Record<string, string | undefined>): EntraAuthGuard {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  return new EntraAuthGuard(config);
}

const CONFIGURED = {
  ENTRA_ALLOWED_TENANTS: `${TENANT_A},${TENANT_B}`,
  ENTRA_API_AUDIENCE: AUDIENCE,
};

const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

// ── 테스트 ────────────────────────────────────────────────────────────

describe('EntraAuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSigningKey.mockResolvedValue({ getPublicKey: () => pem(publicKey) });
  });

  describe('정상 경로', () => {
    it('올바른 토큰이면 통과시키고 신원을 request 에 실어준다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx, request } = contextWith(bearer(goodToken()));

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(request.entraUser).toEqual({
        tenantId: TENANT_A,
        objectId: OID,
        internalUserId: `${TENANT_A}:${OID}`,
        displayName: '김대리',
        preferredUsername: 'daeri@geniein.com',
      });
    });

    it('★ 두 번째 테넌트도 통과한다 — iss 를 고정 문자열로 두면 여기서 깨진다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx, request } = contextWith(
        bearer(goodToken({ tid: TENANT_B })),
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(request.entraUser?.internalUserId).toBe(`${TENANT_B}:${OID}`);
    });

    it('테넌트별 JWKS URL 을 쓴다', async () => {
      const guard = guardWith(CONFIGURED);
      await guard.canActivate(
        contextWith(bearer(goodToken({ tid: TENANT_B }))).ctx,
      );

      expect(mockJwksOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          jwksUri: `https://login.microsoftonline.com/${TENANT_B}/discovery/v2.0/keys`,
        }),
      );
    });

    it('같은 테넌트를 반복 호출해도 JWKS 클라이언트를 다시 만들지 않는다', async () => {
      const guard = guardWith(CONFIGURED);
      await guard.canActivate(contextWith(bearer(goodToken())).ctx);
      await guard.canActivate(contextWith(bearer(goodToken())).ctx);

      expect(mockJwksOptions).toHaveBeenCalledTimes(1);
    });

    it('scp 가 여러 개여도 access_as_user 가 있으면 통과한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ scp: 'openid access_as_user profile' })),
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe('★ 멀티테넌트 경계 — 가장 중요한 구멍', () => {
    it('허용목록에 없는 테넌트의 토큰을 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(goodToken({ tid: OUTSIDER })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('허용목록에서 걸리면 JWKS 를 부르지도 않는다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(goodToken({ tid: OUTSIDER })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockGetSigningKey).not.toHaveBeenCalled();
    });

    it('tid 는 우리 것인데 발급자가 다른 테넌트면 거부한다 (iss 조립 검증)', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ tid: TENANT_A, iss: issuerOf(OUTSIDER) })),
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('aud 가 우리 API 가 아니면 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ aud: 'api://someone-else.example.com/abc' })),
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  /**
   * 토큰이 v1 이냐 v2 냐는 Entra 앱 등록의 `accessTokenAcceptedVersion` 이 정한다.
   * 한쪽만 받으면 조용히 401 이 나고 화면에는 "로그인이 만료되었습니다"로만 보인다 —
   * 실제로 첫 배포가 이걸로 막혔다. 양쪽을 받되 **경계는 좁혀둔 채**여야 한다.
   */
  describe('토큰 버전 (v1 / v2)', () => {
    it('v1 발급자(sts.windows.net)를 통과시킨다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx, request } = contextWith(
        bearer(goodToken({ tid: TENANT_A, iss: v1IssuerOf(TENANT_A) })),
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(request.entraUser?.tenantId).toBe(TENANT_A);
    });

    it('v2 발급자(login.microsoftonline.com)도 통과시킨다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ tid: TENANT_B, iss: issuerOf(TENANT_B) })),
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('v1 형식이어도 발급 테넌트가 다르면 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ tid: TENANT_A, iss: v1IssuerOf(OUTSIDER) })),
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('aud 가 clientId GUID 단독이어도 통과시킨다 (v2 토큰)', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(goodToken({ aud: CLIENT_ID })));

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('남의 clientId GUID 는 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ aud: '11111111-2222-3333-4444-555555555555' })),
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('서명', () => {
    it('남의 키로 서명한 토큰을 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(
        bearer(goodToken({ key: forged.privateKey })),
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('HS256 으로 서명한 토큰을 거부한다 (알고리즘 혼동 방어)', async () => {
      const guard = guardWith(CONFIGURED);
      // 공개키를 HMAC 비밀키로 써서 서명하는 고전적인 수법
      const hs = goodToken({ algorithm: 'HS256', key: pem(publicKey) });

      await expect(
        guard.canActivate(contextWith(bearer(hs)).ctx),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('alg=none 토큰을 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const none = goodToken({ algorithm: 'none', key: '' });

      await expect(
        guard.canActivate(contextWith(bearer(none)).ctx),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('만료된 토큰을 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(goodToken({ expiresIn: '-5m' })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('서명 키를 못 가져오면 거부한다 (500 이 아니라 401)', async () => {
      mockGetSigningKey.mockRejectedValue(new Error('kid not found'));
      const guard = guardWith(CONFIGURED);

      await expect(
        guard.canActivate(contextWith(bearer(goodToken())).ctx),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('클레임', () => {
    it('scp 에 access_as_user 가 없으면 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(goodToken({ scp: 'openid profile' })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('scp 가 아예 없으면 거부한다 (앱 전용 토큰)', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(token({ oid: OID })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('oid 가 없으면 거부한다 — 신원 없이 통과시키면 감사 로그가 무의미해진다', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith(bearer(token({ scp: 'access_as_user' })));

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('tid 가 없는 토큰을 거부한다', async () => {
      const guard = guardWith(CONFIGURED);
      const raw = sign(
        { oid: OID, scp: 'access_as_user', aud: AUDIENCE },
        privateKey,
        {
          algorithm: 'RS256',
          keyid: 'test-kid',
        },
      );

      await expect(
        guard.canActivate(contextWith(bearer(raw)).ctx),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Authorization 헤더', () => {
    it.each([
      ['헤더 없음', {}],
      ['Bearer 아님', { authorization: 'Basic abcdef' }],
      ['토큰 없이 Bearer 만', { authorization: 'Bearer' }],
      ['빈 문자열', { authorization: '' }],
      ['JWT 가 아님', { authorization: 'Bearer not-a-jwt' }],
    ])('%s → 401', async (_label, headers) => {
      const guard = guardWith(CONFIGURED);
      await expect(guard.canActivate(contextWith(headers).ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('배열로 온 헤더는 거부한다 (헤더 주입 방어)', async () => {
      const guard = guardWith(CONFIGURED);
      const { ctx } = contextWith({ authorization: [`Bearer ${goodToken()}`] });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ★ ServiceTokenGuard 와 같은 규칙. "설정 안 했으니 열어둔다"가 원래의 취약점이었다.
  describe('설정 누락은 인증 해제가 아니다', () => {
    it.each([
      ['둘 다 없음', {}],
      ['테넌트 목록 없음', { ENTRA_API_AUDIENCE: AUDIENCE }],
      ['audience 없음', { ENTRA_ALLOWED_TENANTS: `${TENANT_A},${TENANT_B}` }],
      ['테넌트 목록이 쉼표뿐', { ...CONFIGURED, ENTRA_ALLOWED_TENANTS: ' , ' }],
    ])('%s → 503', async (_label, env) => {
      const guard = guardWith(env);
      await expect(
        guard.canActivate(contextWith(bearer(goodToken())).ctx),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('테넌트 목록의 공백을 다듬는다', async () => {
      const guard = guardWith({
        ...CONFIGURED,
        ENTRA_ALLOWED_TENANTS: ` ${TENANT_A} , ${TENANT_B} `,
      });

      await expect(
        guard.canActivate(contextWith(bearer(goodToken())).ctx),
      ).resolves.toBe(true);
    });
  });
});
