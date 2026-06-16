import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('site_audits')
export class SiteAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  categoryScores: Record<string, number>;

  @Column({ default: 0 })
  pagesCrawled: number;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
