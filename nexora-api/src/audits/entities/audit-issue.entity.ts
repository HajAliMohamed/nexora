import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('audit_issues')
export class AuditIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  auditId: string;

  @Column()
  url: string;

  @Column()
  type: string;

  @Column()
  severity: string;

  @Column()
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
