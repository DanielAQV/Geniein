/**
 * 마이키가 **먼저 말을 걸기 위한 손잡이**.
 *
 * Teams 는 "이 사용자에게 보내라" 는 API 를 주지 않는다. 대신 사용자가 앱을
 * 설치하거나 한 번 말을 걸 때 오는 활동에서 `conversationReference` 를 얻고,
 * 그걸 다시 넣어 대화를 이어 붙이는 방식이다. 그래서 이 표가 없으면 선제
 * 발신이라는 것 자체가 성립하지 않는다.
 *
 * ★ 설계문서 4장의 `agent_conversations`(대화 로그)와 다른 표다. 저쪽은 주고받은
 *   말을 쌓는 곳이고 여기는 **핸들 저장소**다. 이름을 나눠 둔 이유는, 하나로
 *   합치면 로그 보존정책이 발신 능력을 지우게 되기 때문이다 — 오래된 대화를
 *   지우는 순간 그 사람에게 다시는 말을 못 걸게 된다.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 봇 대화에 들고 다니는 최근 맥락의 상한. 이력은 비용이고, 여기선 서버가 낸다. */
export const MAX_BOT_TURNS = 10;

@Entity('bot_conversations')
@Index(['tenantId', 'objectId'], { unique: true })
export class BotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Entra 테넌트. 그대로 org_id 가 되어 인격과 코퍼스를 가른다 */
  @Column({ name: 'tenant_id', type: 'text' })
  tenantId: string;

  /** 테넌트 안에서의 사용자 객체 ID (`from.aadObjectId`) */
  @Column({ name: 'object_id', type: 'text' })
  objectId: string;

  /**
   * Bot Framework 의 ConversationReference 원형.
   *
   * ★ 우리가 해석하지 않는다. 모양이 SDK 소유이고 버전에 따라 늘어나므로,
   *   컬럼으로 쪼개 두면 SDK 가 바뀔 때 조용히 발신이 깨진다.
   */
  @Column({ name: 'reference', type: 'jsonb' })
  reference: Record<string, unknown>;

  /**
   * 최근 몇 마디. 봇 채널에는 이력을 들고 있다가 되보내 줄 클라이언트가 없다 —
   * 탭과 달리 서버가 기억해야 대화가 이어진다.
   */
  @Column({ name: 'recent_turns', type: 'jsonb', default: () => "'[]'::jsonb" })
  recentTurns: { role: 'user' | 'assistant'; text: string }[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
