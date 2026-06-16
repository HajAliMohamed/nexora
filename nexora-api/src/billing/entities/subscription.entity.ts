import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import type { PlanLimits } from '../../types/shared';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column()
  plan: string;

  @Column({ type: 'jsonb' })
  limits: PlanLimits;

  @Column()
  status: string;

  @Column({ nullable: true })
  currentPeriodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;
}
