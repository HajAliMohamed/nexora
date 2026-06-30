import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Competitor } from '../../projects/entities/competitor.entity';
import { Keyword } from '../../keywords/entities/keyword.entity';

@Entity('competitor_positions')
export class CompetitorPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Competitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitorId' })
  competitor: Competitor;

  @Column()
  competitorId: string;

  @ManyToOne(() => Keyword, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'keywordId' })
  keyword: Keyword;

  @Column()
  keywordId: string;

  @Column({ type: 'int', nullable: true })
  position: number | null;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @CreateDateColumn()
  date: Date;
}
