import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Agency } from './agency.entity';
import { User } from '../../users/entities/user.entity';

@Entity('agency_members')
@Unique(['agencyId', 'userId'])
export class AgencyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency: Agency;

  @Column()
  agencyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: 'member' })
  role: 'owner' | 'admin' | 'member';

  @CreateDateColumn()
  createdAt: Date;
}
