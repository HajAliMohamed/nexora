import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('backlink_outreach')
export class BacklinkOutreach {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  opportunityId: string;

  @Column()
  projectId: string;

  @Column()
  recipientEmail: string;

  @Column({ type: 'text' })
  emailContent: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  responseAt: Date;

  @Column({ nullable: true })
  responseType: string;

  @CreateDateColumn()
  createdAt: Date;
}
