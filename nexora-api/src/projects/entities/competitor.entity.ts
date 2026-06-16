import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('competitors')
export class Competitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  domain: string;

  @CreateDateColumn()
  createdAt: Date;
}
