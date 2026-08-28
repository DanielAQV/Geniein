import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InsightsModule } from './insights/insights.module';
import { AgentModule } from './agent/agent.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        // ★ 켜지 말 것. synchronize 는 엔티티에 없는 컬럼을 drop 하려 든다 —
        // kb_chunks.embedding(pgvector) 처럼 raw SQL 로 만든 스키마가 사라진다.
        // 스키마 변경은 `pnpm migration:generate` → `pnpm migration:run` 으로만 한다.
        synchronize: false,
        // 마이그레이션도 자동 실행하지 않는다. 배포 파이프라인의 명시적 단계여야 한다.
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    InsightsModule,
    AgentModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
