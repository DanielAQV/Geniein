import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PublishStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

export enum Category {
  ODA = 'oda',
  IT = 'it',
  POLICY = 'policy',
}

@Entity('ai_posts')
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  source_document_id: string;

  @Column({ type: 'text', nullable: true })
  title_kr: string;

  @Column({ type: 'text', nullable: true })
  title_en: string;

  @Column({ type: 'text', nullable: true })
  title_vn: string;

  @Column({ type: 'text', nullable: true })
  summary_kr: string;

  @Column({ type: 'text', nullable: true })
  summary_en: string;

  @Column({ type: 'text', nullable: true })
  summary_vn: string;

  @Column({ type: 'text', nullable: true })
  body_kr: string;

  @Column({ type: 'text', nullable: true })
  body_en: string;

  @Column({ type: 'text', nullable: true })
  body_vn: string;

  @Column({ type: 'text', nullable: true })
  perspective_kr: string;

  @Column({ type: 'text', nullable: true })
  perspective_en: string;

  @Column({ type: 'text', nullable: true })
  perspective_vn: string;

  @Column({ type: 'float', default: 0 })
  relevance_score: number;

  @Column({ type: 'text', nullable: true })
  thumbnail_url: string;

  @Column({
    type: 'enum',
    enum: Category,
    default: Category.ODA,
  })
  category: Category;

  @Column('text', { array: true, nullable: true })
  tags: string[];

  @Column({ type: 'float', default: 0 })
  confidence_score: number;

  @Column({ type: 'float', default: 0 })
  quality_score: number;

  @Column({ type: 'float', default: 0 })
  novelty_score: number;

  @Column({
    type: 'enum',
    enum: PublishStatus,
    default: PublishStatus.DRAFT,
  })
  publish_status: PublishStatus;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Embedding column is usually handled via raw SQL or special extensions
  // For now, we omit it from the TypeORM entity to avoid driver issues, 
  // but it will exist in the actual DB table for pgvector.
}
