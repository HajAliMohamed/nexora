import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('landing_pages')
export class LandingPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  html: string;

  @Column({ nullable: true })
  cmsUrl: string;

  @Column({ default: 'draft' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
