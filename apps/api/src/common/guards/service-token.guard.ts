/**
 * 서비스 간 인증 — Next.js BFF 만 이 엔드포인트를 부를 수 있다.
 *
 * 설계문서 3.6: NestJS 가 상태 소유자이자 유일한 인터넷 노출면이고,
 * 브라우저는 BFF 를 거친다. 따라서 관리자 엔드포인트에 필요한 것은
 * "사용자 인증"이 아니라 "호출자가 우리 BFF 인가"다. 사용자 신원은
 * BFF 가 세션으로 이미 확인했고 x-acting-user 로 넘어온다.
 *
 * ⚠ 이 토큰은 사용자 자격증명이 아니다. 유출되면 관리자 데이터가 열리므로
 *   .env 에만 두고 브라우저로 내려보내지 않는다 (NEXT_PUBLIC_ 접두어 금지).
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
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly logger = new Logger(ServiceTokenGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_SERVICE_TOKEN');

    // 설정이 없으면 통과시키지 않는다. "설정 안 했으니 열어둔다"가
    // 이 시스템이 원래 갖고 있던 문제였다.
    if (!expected) {
      this.logger.error('ADMIN_SERVICE_TOKEN 이 설정되지 않아 관리자 엔드포인트를 차단합니다');
      throw new ServiceUnavailableException('admin endpoint is not configured');
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const provided = request.headers['x-service-token'];

    if (typeof provided !== 'string' || !this.matches(provided, expected)) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // timingSafeEqual 은 길이가 다르면 던진다. 길이 비교를 먼저 한다.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
