import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true, default: '#6366f1' })
  primaryColor: string;

  @Column({ nullable: true, default: '#ffffff' })
  secondaryColor: string;

  @Column({ nullable: true })
  customDomain: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @Column()
  ownerUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
