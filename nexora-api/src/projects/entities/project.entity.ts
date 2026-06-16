import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Competitor } from './competitor.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  domain: string;

  @Column()
  countryCode: string;

  @Column()
  languageCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Competitor, c => c.project, { cascade: true })
  competitors: Competitor[];
}
