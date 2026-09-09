import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum JobLocation {
  SEONGNAM = 'seongnam',
  HANOI = 'hanoi',
}

export enum EmploymentType {
  FULLTIME = 'fulltime',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export enum JobPublishStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * 채용 공고.
 *
 * 다국어 정책: **KR 만 NOT NULL**. EN/VN 은 비워둘 수 있고, 프론트에서
 * `pick(field, lang)` 이 KR 로 떨어뜨린다 (apps/web/src/lib/careers/jobs.ts).
 * 한국어만 쓰고 올리는 게 정상 경로라서 DB 가 3개 언어를 강제하면 안 된다.
 *
 * ai_posts 의 언어별 컬럼 관례를 그대로 따른다 — jsonb 한 덩어리로 묶으면
 * 부문·근무지별 집계나 부분 검색을 SQL 로 못 한다.
 *
 * ★ synchronize 는 꺼져 있다. 이 엔티티를 고치면 반드시 마이그레이션도 같이 고친다.
 */
@Entity('job_postings')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── 분류 (필터·집계용 안정 키) ──────────────────────────────────
  /** 부문 키. 'oda' | 'engineering' | 'operations' | 'management' 등 자유 문자열 */
  @Column({ type: 'text' })
  department_key: string;

  @Column({ type: 'enum', enum: JobLocation, default: JobLocation.SEONGNAM })
  location_key: JobLocation;

  /** 컬럼은 유지하되 프론트 필터 축으로는 쓰지 않는다. 카드 뱃지 표시용. */
  @Column({ type: 'enum', enum: EmploymentType, default: EmploymentType.FULLTIME })
  employment_type: EmploymentType;

  // ── 표시 문구 ────────────────────────────────────────────────
  @Column({ type: 'text' })
  title_kr: string;

  @Column({ type: 'text', nullable: true })
  title_en: string | null;

  @Column({ type: 'text', nullable: true })
  title_vn: string | null;

  @Column({ type: 'text' })
  department_kr: string;

  @Column({ type: 'text', nullable: true })
  department_en: string | null;

  @Column({ type: 'text', nullable: true })
  department_vn: string | null;

  @Column({ type: 'text' })
  location_kr: string;

  @Column({ type: 'text', nullable: true })
  location_en: string | null;

  @Column({ type: 'text', nullable: true })
  location_vn: string | null;

  @Column({ type: 'text' })
  employment_kr: string;

  @Column({ type: 'text', nullable: true })
  employment_en: string | null;

  @Column({ type: 'text', nullable: true })
  employment_vn: string | null;

  @Column({ type: 'text' })
  experience_kr: string;

  @Column({ type: 'text', nullable: true })
  experience_en: string | null;

  @Column({ type: 'text', nullable: true })
  experience_vn: string | null;

  // ── 목록 필드 ────────────────────────────────────────────────
  @Column('text', { array: true, default: () => "'{}'" })
  tags_kr: string[];

  @Column('text', { array: true, nullable: true })
  tags_en: string[] | null;

  @Column('text', { array: true, nullable: true })
  tags_vn: string[] | null;

  @Column('text', { array: true, default: () => "'{}'" })
  responsibilities_kr: string[];

  @Column('text', { array: true, nullable: true })
  responsibilities_en: string[] | null;

  @Column('text', { array: true, nullable: true })
  responsibilities_vn: string[] | null;

  @Column('text', { array: true, default: () => "'{}'" })
  requirements_kr: string[];

  @Column('text', { array: true, nullable: true })
  requirements_en: string[] | null;

  @Column('text', { array: true, nullable: true })
  requirements_vn: string[] | null;

  @Column('text', { array: true, default: () => "'{}'" })
  preferred_kr: string[];

  @Column('text', { array: true, nullable: true })
  preferred_en: string[] | null;

  @Column('text', { array: true, nullable: true })
  preferred_vn: string[] | null;

  // ── 운영 ────────────────────────────────────────────────────
  /** ★ NULL = 상시 채용. 프론트의 "rolling" 은 여기서 NULL 로 매핑된다. */
  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({
    type: 'enum',
    enum: JobPublishStatus,
    default: JobPublishStatus.DRAFT,
  })
  publish_status: JobPublishStatus;

  /** 목록 노출 순서. 낮을수록 위. 같으면 published_at 최신순. */
  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date | null;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
