import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('backlink_opportunities')
export class BacklinkOpportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  targetUrl: string;

  @Column()
  sourceDomain: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ type: 'int', nullable: true })
  authority: number;

  @Column({ type: 'int', default: 0 })
  probabilityScore: number;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
