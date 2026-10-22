/**
 * Genie 가 Zalo 로 **먼저 말을 걸기 위한 손잡이**.
 *
 * Zalo Bot Platform 은 사용자가 봇에게 한 번 말을 걸어야 DM 이 열린다. 그때 온
 * `from.id`(= DM 의 `chat.id`)를 여기 저장해 두면, 나중에 뒷단(메일 트리거·일정·
 * 뇌)이 "이 사람에게 보내라"고 할 수 있다. 이 표가 없으면 선제 발신이 성립하지
 * 않는다 — bot_conversations(Teams)와 같은 이유로 대화 로그와 분리한다.
 *
 * recent_turns 는 서버가 들고 있는 최근 문답이다. Zalo 에는 이력을 되보내 줄
 * 클라이언트가 없고, 게이트웨이 메모리에 두면 재시작마다 사라진다.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const MAX_ZALO_TURNS = 10;

export interface ZaloTurn {
  role: 'user' | 'assistant';
  text: string;
}

@Entity('zalo_contacts')
@Index(['zaloUserId'], { unique: true })
export class ZaloContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 웹훅 `from.id`. DM 에서는 `chat.id` 와 같다 */
  @Column({ name: 'zalo_user_id', type: 'text' })
  zaloUserId: string;

  /** 웹훅 `from.display_name`. 사람이 목록에서 알아보기 위한 것이지 신원이 아니다 */
  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName: string | null;

  /** 보낼 때 쓰는 대화 id. DM 은 zalo_user_id 와 같지만 따로 둔다 — 그룹이 생기면 달라진다 */
  @Column({ name: 'chat_id', type: 'text' })
  chatId: string;

  @Column({ name: 'recent_turns', type: 'jsonb', default: () => "'[]'::jsonb" })
  recentTurns: ZaloTurn[];

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'now()' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
