
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
  // 절대 true 로 되돌리지 않는다. synchronize 는 엔티티에 없는 컬럼을 drop 하려 들어
  // kb_chunks.embedding(pgvector) 처럼 raw SQL 로 만든 것들이 사라진다.
  synchronize: false,
});
