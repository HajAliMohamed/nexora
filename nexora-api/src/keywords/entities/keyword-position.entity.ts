import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Keyword } from './keyword.entity';

@Entity('keyword_positions')
export class KeywordPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Keyword, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'keywordId' })
  keyword: Keyword;

  @Column()
  keywordId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true, type: 'int' })
  position: number | null;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'jsonb', default: '{}' })
  serpFeatures: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
