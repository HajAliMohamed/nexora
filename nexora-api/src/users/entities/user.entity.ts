import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { Session } from '../../auth/entities/session.entity';
import { Subscription } from '../../billing/entities/subscription.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: false })
  onboardingComplete: boolean;

  @Column({ nullable: true })
  agencyId: string;

  @Column({ default: 'user' })
  role: 'user' | 'owner' | 'admin' | 'member' | 'client';

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Session, s => s.user, { cascade: true })
  sessions: Session[];

  @OneToMany(() => Subscription, s => s.user, { cascade: true })
  subscriptions: Subscription[];

  @OneToMany(() => Project, p => p.user, { cascade: true })
  projects: Project[];
}
