import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('automation_logs')
export class AutomationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleId: string;

  @Column()
  projectId: string;

  @Column()
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;
}
