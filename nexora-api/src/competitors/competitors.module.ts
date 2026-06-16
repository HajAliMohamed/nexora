import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competitor } from '../projects/entities/competitor.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { CompetitorsService } from './competitors.service';
import { CompetitorsController } from './competitors.controller';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Competitor, Keyword, KeywordPosition]),
    forwardRef(() => BillingModule),
    forwardRef(() => ProjectsModule),
  ],
  providers: [CompetitorsService],
  controllers: [CompetitorsController],
  exports: [CompetitorsService],
})
export class CompetitorsModule {}
