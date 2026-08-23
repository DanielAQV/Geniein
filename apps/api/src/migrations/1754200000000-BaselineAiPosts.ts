import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineAiPosts1754200000000 implements MigrationInterface {
  name = 'BaselineAiPosts1754200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // CREATE TYPE 에는 IF NOT EXISTS 가 없다
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ai_posts_category_enum" AS ENUM ('oda', 'it', 'policy');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ai_posts_publish_status_enum"
          AS ENUM ('draft', 'published', 'archived', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_posts" (
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source_document_id" character varying,
        "title_kr"           text,
        "title_en"           text,
        "title_vn"           text,
        "summary_kr"         text,
        "summary_en"         text,
        "summary_vn"         text,
        "body_kr"            text,
        "body_en"            text,
        "body_vn"            text,
        "perspective_kr"     text,
        "perspective_en"     text,
        "perspective_vn"     text,
        "relevance_score"    double precision NOT NULL DEFAULT 0,
        "thumbnail_url"      text,
        "category"           "public"."ai_posts_category_enum" NOT NULL DEFAULT 'oda',
        "tags"               text array,
        "confidence_score"   double precision NOT NULL DEFAULT 0,
        "quality_score"      double precision NOT NULL DEFAULT 0,
        "novelty_score"      double precision NOT NULL DEFAULT 0,
        "publish_status"     "public"."ai_posts_publish_status_enum" NOT NULL DEFAULT 'draft',
        "published_at"       TIMESTAMP,
        "view_count"         integer NOT NULL DEFAULT 0,
        "created_at"         TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_posts" PRIMARY KEY ("id")
      )
    `);

    // 공개 목록 조회 경로 (findPublished)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ai_posts_published_idx"
        ON "ai_posts" ("publish_status", "published_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ai_posts_published_idx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_posts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ai_posts_publish_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ai_posts_category_enum"`);
  }
}
