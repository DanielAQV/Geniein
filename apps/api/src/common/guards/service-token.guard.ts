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

    // 설정이 없으면 통과시키지 않는다. "설정 안 했으니 열어둔다"는 열어두는 것이다.
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
