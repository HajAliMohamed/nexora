import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('ai_search_snapshots')
export class AiSearchSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  prompt: string;

  @Column({ default: false })
  present: boolean;

  @Column({ default: 'searxng' })
  source: 'google_ai' | 'chatgpt' | 'searxng';

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, unknown>;

  @CreateDateColumn()
  snapshotDate: Date;
}
