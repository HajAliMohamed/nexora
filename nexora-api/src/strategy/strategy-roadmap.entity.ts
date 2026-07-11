import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../projects/entities/project.entity';

@Entity('strategy_roadmaps')
export class StrategyRoadmap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column({ type: 'jsonb' })
  content: Record<string, unknown>;

  @Column({ default: 90 })
  horizonDays: number;

  @Column({ default: 'traffic' })
  businessGoal: string;

  @CreateDateColumn()
  createdAt: Date;
}
