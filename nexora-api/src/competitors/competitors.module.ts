import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competitor } from '../projects/entities/competitor.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { CompetitorPosition } from './entities/competitor-position.entity';
import { CompetitorsService } from './competitors.service';
import { CompetitorsController } from './competitors.controller';
import { SerpModule } from '../serp/serp.module';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Competitor, Keyword, KeywordPosition, CompetitorPosition]),
    forwardRef(() => BillingModule),
    forwardRef(() => ProjectsModule),
    SerpModule,
  ],
  providers: [CompetitorsService],
  controllers: [CompetitorsController],
  exports: [CompetitorsService],
})
export class CompetitorsModule {}
