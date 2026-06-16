import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('seo_alerts')
export class SeoAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  projectId: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}
