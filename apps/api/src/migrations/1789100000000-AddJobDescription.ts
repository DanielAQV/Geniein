import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 공고에 자유 서술 칸을 추가한다.
 *
 * 왜: 기존 칸은 전부 키워드·불릿이었다(title / tags / responsibilities / ...).
 * 실제로 들어온 공고문에는 회사·사업 설명, 급여·근무조건, 문의 전화처럼
 * 줄로 쪼개면 뜻이 깨지는 산문이 있어서 어디에도 담기지 않았다.
 *
 * ★ KR 도 NULL 을 허용한다. 이 칸이 없던 시절 올린 공고가 이미 게시 중이라
 *   NOT NULL 을 걸면 여기서 떨어진다. 다른 텍스트 칸의 "KR NOT NULL" 정책과
 *   다른 유일한 자리다.
 *
 * ADD COLUMN IF NOT EXISTS 로 멱등하다 — 이미 칸이 있는 DB 에서 다시 돌아도
 * 터지지 않는다.
 */
export class AddJobDescription1789100000000 implements MigrationInterface {
  name = 'AddJobDescription1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_postings"
        ADD COLUMN IF NOT EXISTS "description_kr" text,
        ADD COLUMN IF NOT EXISTS "description_en" text,
        ADD COLUMN IF NOT EXISTS "description_vn" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_postings"
        DROP COLUMN IF EXISTS "description_kr",
        DROP COLUMN IF EXISTS "description_en",
        DROP COLUMN IF EXISTS "description_vn";
    `);
  }
}
