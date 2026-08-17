/**
 * TypeORM CLI 용 DataSource.
 *
 * 왜 별도 파일인가: app.module.ts 의 설정은 Nest DI 안에서 만들어지므로
 * CLI(`typeorm migration:run`)가 읽을 수 없다. 두 곳이 같은 DB 를 보도록
 * 접속 정보는 환경변수 하나에서만 온다.
 *
 * 스키마 소유권 (설계문서 4장):
 *   ai_posts        — TypeORM 엔티티. 여기 마이그레이션이 관리한다
 *   kb_documents/kb_chunks — agent-service 소유. db/init/*.sql 이 관리한다.
 *                     TypeORM 엔티티를 만들지 않는다
 */

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // ★ 절대 true 로 되돌리지 않는다.
  // synchronize 는 엔티티에 없는 컬럼을 "미지의 컬럼"으로 보고 drop 을 시도한다.
  // kb_chunks.embedding(pgvector) 처럼 raw SQL 로 만든 것들이 사라진다.
  synchronize: false,
});
