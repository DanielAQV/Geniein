import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 마이키가 먼저 말을 걸기 위한 손잡이 저장소.
 *
 * (tenant_id, object_id) 가 유일하다 — 사람 하나에 손잡이 하나다. 같은 사람이
 * 여러 기기에서 Teams 를 써도 개인 대화는 하나이므로 행이 늘지 않는다.
 */
export class BotConversations1756370000000 implements MigrationInterface {
  name = 'BotConversations1756370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bot_conversations (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    text NOT NULL,
        object_id    text NOT NULL,
        reference    jsonb NOT NULL,
        recent_turns jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS bot_conversations_tenant_object_idx
        ON bot_conversations (tenant_id, object_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bot_conversations`);
  }
}
