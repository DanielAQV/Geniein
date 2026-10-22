/**
 * 신입 온보딩 한 건. HR 이 등록하면 코드가 나오고, 신입이 Zalo 로 그 코드를 보내는
 * 순간 Zalo 계정이 이 행(이름·팀)과 이어진다.
 *
 * ★ 이게 Zalo 의 "먼저 말을 걸어야 DM 이 열린다" 제약을 푸는 방식이자, 동시에
 *   "이 Zalo 사용자가 누구인가"(신원 매핑)를 푸는 첫 자리다. 코드는 HR 이 사람에게
 *   직접 건네므로, 코드를 보낸 Zalo 계정 = 그 신입이라고 믿는다.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('zalo_onboarding')
@Index(['code'], { unique: true })
export class ZaloOnboarding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** GENIE-0000 형태. 대소문자 무시로 비교한다 */
  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  team: string | null;

  /** 입사일 (YYYY-MM-DD). 단계 메시지의 기준일 */
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'zalo_user_id', type: 'text', nullable: true })
  zaloUserId: string | null;

  @Column({ name: 'linked_at', type: 'timestamptz', nullable: true })
  linkedAt: Date | null;

  /** 보낸 단계 수. 0 = 환영만 갔다(또는 아직). onboarding-steps.ts 의 인덱스+1 */
  @Column({ name: 'steps_sent', type: 'int', default: 0 })
  stepsSent: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
