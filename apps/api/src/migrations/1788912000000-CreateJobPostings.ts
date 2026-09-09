import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 채용 공고 테이블.
 *
 * ★ 아직 어느 DB 에도 적용하지 않았다. 실행은 `pnpm --filter api migration:run` 이
 *   배포 파이프라인의 명시적 단계로 돌 때다 (app.module 의 migrationsRun 은 false).
 *
 * 다국어 정책 (대표 확정): **KR 만 NOT NULL**, EN/VN 은 nullable.
 * 프론트가 `pick(field, lang)` 으로 KR 폴백을 하므로 DB 가 3개 언어를 강제하지 않는다.
 *
 * deadline 은 NULL 이 "상시 채용"이다. 프론트의 "rolling" 문자열은 어댑터에서 NULL 로 간다.
 * 마법 문자열을 컬럼에 넣으면 날짜 비교(마감 임박 집계)를 할 수 없다.
 *
 * 베이스라인과 같은 이유로 전부 멱등하게 쓴다.
 */
export class CreateJobPostings1788912000000 implements MigrationInterface {
  name = 'CreateJobPostings1788912000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // CREATE TYPE 에는 IF NOT EXISTS 가 없다
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."job_postings_location_key_enum" AS ENUM ('seongnam', 'hanoi');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."job_postings_employment_type_enum"
          AS ENUM ('fulltime', 'contract', 'intern');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."job_postings_publish_status_enum"
          AS ENUM ('draft', 'published', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_postings" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),

        "department_key"        text NOT NULL,
        "location_key"          "public"."job_postings_location_key_enum"
                                  NOT NULL DEFAULT 'seongnam',
        "employment_type"       "public"."job_postings_employment_type_enum"
                                  NOT NULL DEFAULT 'fulltime',

        "title_kr"              text NOT NULL,
        "title_en"              text,
        "title_vn"              text,
        "department_kr"         text NOT NULL,
        "department_en"         text,
        "department_vn"         text,
        "location_kr"           text NOT NULL,
        "location_en"           text,
        "location_vn"           text,
        "employment_kr"         text NOT NULL,
        "employment_en"         text,
        "employment_vn"         text,
        "experience_kr"         text NOT NULL,
        "experience_en"         text,
        "experience_vn"         text,

        "tags_kr"               text array NOT NULL DEFAULT '{}',
        "tags_en"               text array,
        "tags_vn"               text array,
        "responsibilities_kr"   text array NOT NULL DEFAULT '{}',
        "responsibilities_en"   text array,
        "responsibilities_vn"   text array,
        "requirements_kr"       text array NOT NULL DEFAULT '{}',
        "requirements_en"       text array,
        "requirements_vn"       text array,
        "preferred_kr"          text array NOT NULL DEFAULT '{}',
        "preferred_en"          text array,
        "preferred_vn"          text array,

        -- NULL = 상시 채용
        "deadline"              date,
        "publish_status"        "public"."job_postings_publish_status_enum"
                                  NOT NULL DEFAULT 'draft',
        "sort_order"            integer NOT NULL DEFAULT 0,
        "published_at"          TIMESTAMP,
        "view_count"            integer NOT NULL DEFAULT 0,
        "created_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_job_postings" PRIMARY KEY ("id")
      )
    `);

    // 공개 목록 조회 경로 (findPublished)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "job_postings_published_idx"
        ON "job_postings" ("publish_status", "sort_order", "published_at" DESC)
    `);

    // 관리자 화면의 부문 필터·집계
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "job_postings_department_idx"
        ON "job_postings" ("department_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "job_postings_department_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "job_postings_published_idx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_postings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_postings_publish_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_postings_employment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_postings_location_key_enum"`);
  }
}
