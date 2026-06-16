import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  keyword: string;

  @Column()
  countryCode: string;

  @Column()
  languageCode: string;

  @Column({ default: 'desktop' })
  device: string;

  @CreateDateColumn()
  createdAt: Date;
}
