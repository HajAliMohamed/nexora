import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('growth_signals')
export class GrowthSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  type: 'page' | 'keyword' | 'backlink';

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ nullable: true })
  period: string;

  @CreateDateColumn()
  createdAt: Date;
}
