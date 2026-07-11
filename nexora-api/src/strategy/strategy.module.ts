import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StrategyRoadmap } from './strategy-roadmap.entity';
import { Project } from '../projects/entities/project.entity';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Competitor } from '../projects/entities/competitor.entity';
import { AiSearchSnapshot } from '../ai-search/entities/ai-search-snapshot.entity';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StrategyRoadmap, Project, SiteAudit, AuditIssue,
      Keyword, KeywordPosition, Competitor, AiSearchSnapshot,
    ]),
    ConfigModule,
  ],
  providers: [StrategyService],
  controllers: [StrategyController],
  exports: [StrategyService],
})
export class StrategyModule {}
