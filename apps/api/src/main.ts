import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('bootstrap');

  const origins = allowedOrigins();
  if (origins.length > 0) {
    app.enableCors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      // 관리자 데이터는 BFF(서버→서버)로만 오므로 CORS 대상이 아니다.
      // 서비스 토큰을 브라우저가 보낼 일이 없어야 한다 — 허용 헤더에 넣지 않는다.
      allowedHeaders: ['Content-Type', 'Accept'],
    });
    logger.log(`CORS 허용 오리진: ${origins.join(', ')}`);
  } else {
    logger.warn('CORS_ORIGINS 가 비어 있어 CORS 를 비활성화합니다 (같은 오리진만 허용)');
  }

  const helmet = await import('helmet');
  app.use(
    helmet.default({
      xXssProtection: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
