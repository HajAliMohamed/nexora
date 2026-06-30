import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';

@Entity('client_users')
export class ClientUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency: Agency;

  @Column()
  agencyId: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
