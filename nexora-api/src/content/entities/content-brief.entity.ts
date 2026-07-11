import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('content_briefs')
export class ContentBrief {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  brief: string;

  @Column({ type: 'jsonb', nullable: true })
  keywords: string[];

  @Column({ type: 'int', default: 500 })
  targetWordCount: number;

  @Column({ nullable: true })
  generatedArticleId: string;

  @CreateDateColumn()
  createdAt: Date;
}
