import { MigrationInterface, QueryRunner } from 'typeorm';

/** 신입 온보딩 (zalo/onboarding/onboarding.entity.ts). */
export class ZaloOnboarding1792710000000 implements MigrationInterface {
  name = 'ZaloOnboarding1792710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zalo_onboarding (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code          text NOT NULL,
        name          text NOT NULL,
        team          text,
        start_date    date NOT NULL,
        zalo_user_id  text,
        linked_at     timestamptz,
        steps_sent    int NOT NULL DEFAULT 0,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS zalo_onboarding_code_idx ON zalo_onboarding (code)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS zalo_onboarding`);
  }
}
