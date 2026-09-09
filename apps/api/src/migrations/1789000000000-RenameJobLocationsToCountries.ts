import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 근무지 키를 도시에서 국가로 바꾼다.
 *
 *   seongnam -> korea
 *   hanoi    -> vietnam
 *   (신규)   -> philippines
 *
 * 왜: 채용 공고의 근무지는 국가 단위로 고르는 게 맞다. 도시 이름을 키로
 * 박아두면 같은 나라에 사무실이 하나 더 생길 때마다 enum 과 국기 매핑을
 * 같이 고쳐야 한다. 마닐라 법인이 생기면서 실제로 그 시점이 왔다.
 *
 * ★ 이 마이그레이션은 이미 적용된 1788912000000 을 고치지 않는다. 그 파일은
 *   운영 DB 에 적용 완료 기록이 남아 다시 돌지 않으므로, 손대면 새로 만든
 *   DB 와 운영 DB 의 스키마가 갈라진다.
 *
 * RENAME VALUE 를 쓰므로 컬럼 데이터를 옮기지 않는다 — enum 라벨만 바뀌고
 * 저장된 값은 그대로다. 컬럼 기본값도 OID 로 잡혀 있어 같이 따라오지만,
 * 읽는 사람이 헷갈리지 않게 명시적으로 다시 지정한다.
 *
 * PG 17 이라 ADD VALUE 를 트랜잭션 안에서 쓸 수 있다 (PG 12+).
 */
export class RenameJobLocationsToCountries1789000000000 implements MigrationInterface {
  name = 'RenameJobLocationsToCountries1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 멱등하게: 이미 바뀐 DB 에서 다시 돌아도 터지지 않아야 한다.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'job_postings_location_key_enum' AND e.enumlabel = 'seongnam'
        ) THEN
          ALTER TYPE "public"."job_postings_location_key_enum" RENAME VALUE 'seongnam' TO 'korea';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'job_postings_location_key_enum' AND e.enumlabel = 'hanoi'
        ) THEN
          ALTER TYPE "public"."job_postings_location_key_enum" RENAME VALUE 'hanoi' TO 'vietnam';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."job_postings_location_key_enum" ADD VALUE IF NOT EXISTS 'philippines';
    `);

    await queryRunner.query(`
      ALTER TABLE "job_postings" ALTER COLUMN "location_key" SET DEFAULT 'korea';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PG 는 enum 값을 지울 수 없다. 되돌리려면 타입을 새로 만들어 컬럼을 옮긴다.
    // philippines 공고는 옛 스키마에 자리가 없으므로 korea(=seongnam) 로 접는다.
    await queryRunner.query(`
      ALTER TABLE "job_postings" ALTER COLUMN "location_key" DROP DEFAULT;
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."job_postings_location_key_enum_old" AS ENUM ('seongnam', 'hanoi');
    `);
    await queryRunner.query(`
      ALTER TABLE "job_postings"
        ALTER COLUMN "location_key" TYPE "public"."job_postings_location_key_enum_old"
        USING (
          CASE "location_key"::text
            WHEN 'vietnam' THEN 'hanoi'
            ELSE 'seongnam'
          END
        )::"public"."job_postings_location_key_enum_old";
    `);
    await queryRunner.query(`DROP TYPE "public"."job_postings_location_key_enum";`);
    await queryRunner.query(`
      ALTER TYPE "public"."job_postings_location_key_enum_old"
        RENAME TO "job_postings_location_key_enum";
    `);
    await queryRunner.query(`
      ALTER TABLE "job_postings" ALTER COLUMN "location_key" SET DEFAULT 'seongnam';
    `);
  }
}
