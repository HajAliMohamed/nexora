import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  triggerType: string;

  @Column({ type: 'jsonb' })
  triggerConfig: Record<string, unknown>;

  @Column()
  actionType: string;

  @Column({ type: 'jsonb' })
  actionConfig: Record<string, unknown>;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
