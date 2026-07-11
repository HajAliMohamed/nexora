import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../projects/entities/project.entity';

@Entity('predictive_forecasts')
export class PredictiveForecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  metricType: string;

  @Column({ type: 'jsonb' })
  history: Record<string, unknown>[];

  @Column({ type: 'jsonb' })
  forecast: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  anomalies: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  trend: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  risk: Record<string, unknown>;

  @Column({ type: 'int', default: 30 })
  horizonDays: number;

  @CreateDateColumn()
  createdAt: Date;
}
