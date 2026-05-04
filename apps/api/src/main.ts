import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors();

  // Security headers
  const helmet = await import('helmet');
  app.use(
    helmet.default({
      xXssProtection: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
