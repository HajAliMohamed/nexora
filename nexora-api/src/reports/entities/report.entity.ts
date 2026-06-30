import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column({ default: 'monthly' })
  periodType: 'weekly' | 'monthly' | 'quarterly';

  @Column({ type: 'float', nullable: true })
  seoScore: number;

  @Column({ type: 'float', nullable: true })
  aiScore: number;

  @Column({ type: 'float', nullable: true })
  growthScore: number;

  @Column({ type: 'text', nullable: true })
  narrative: string;

  @Column({ type: 'jsonb', default: '[]' })
  recommendations: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: '{}' })
  scores: Record<string, number>;

  @Column({ nullable: true })
  pdfPath: string;

  @Column({ nullable: true })
  signedUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
