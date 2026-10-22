import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Genie 가 Zalo 로 먼저 말을 걸기 위한 손잡이 저장소 (zalo-contact.entity.ts).
 * zalo_user_id 가 유일하다 — 사람 하나에 손잡이 하나.
 */
export class ZaloContacts1792700000000 implements MigrationInterface {
  name = 'ZaloContacts1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zalo_contacts (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        zalo_user_id  text NOT NULL,
        display_name  text,
        chat_id       text NOT NULL,
        recent_turns  jsonb NOT NULL DEFAULT '[]'::jsonb,
        last_seen_at  timestamptz NOT NULL DEFAULT now(),
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS zalo_contacts_user_idx ON zalo_contacts (zalo_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS zalo_contacts`);
  }
}
