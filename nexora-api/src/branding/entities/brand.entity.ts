import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency: Agency;

  @Column()
  agencyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'jsonb', default: '{}' })
  colors: Record<string, string>;

  @Column({ nullable: true })
  domain: string;

  @CreateDateColumn()
  createdAt: Date;
}
