import { ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceTokenGuard } from './service-token.guard';

function contextWith(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function guardWith(token?: string): ServiceTokenGuard {
  const config = { get: () => token } as unknown as ConfigService;
  return new ServiceTokenGuard(config);
}

describe('ServiceTokenGuard', () => {
  const TOKEN = 'super-secret-service-token';

  it('올바른 토큰이면 통과시킨다', () => {
    expect(guardWith(TOKEN).canActivate(contextWith({ 'x-service-token': TOKEN }))).toBe(true);
  });

  it('토큰이 없으면 401', () => {
    expect(() => guardWith(TOKEN).canActivate(contextWith({}))).toThrow(UnauthorizedException);
  });

  it('토큰이 틀리면 401', () => {
    expect(() =>
      guardWith(TOKEN).canActivate(contextWith({ 'x-service-token': 'wrong-token-value' })),
    ).toThrow(UnauthorizedException);
  });

  it('길이가 다른 토큰에서도 던지지 않고 401 로 떨어진다 (timingSafeEqual 방어)', () => {
    expect(() => guardWith(TOKEN).canActivate(contextWith({ 'x-service-token': 'short' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('배열로 온 헤더는 거부한다 (헤더 주입 방어)', () => {
    expect(() =>
      guardWith(TOKEN).canActivate(contextWith({ 'x-service-token': [TOKEN] })),
    ).toThrow(UnauthorizedException);
  });

  // ★ 가장 중요한 케이스. "설정 안 했으니 열어둔다"가 원래의 취약점이었다.
  it('ADMIN_SERVICE_TOKEN 이 설정되지 않으면 통과시키지 않는다', () => {
    expect(() =>
      guardWith(undefined).canActivate(contextWith({ 'x-service-token': 'anything' })),
    ).toThrow(ServiceUnavailableException);
  });
});
