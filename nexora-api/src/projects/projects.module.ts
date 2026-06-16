import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Competitor } from './entities/competitor.entity';
import { ProjectsService } from './projects.service';
import { ProjectsOverviewService } from './projects-overview.service';
import { ProjectsController } from './projects.controller';
import { BillingModule } from '../billing/billing.module';
import { AuditsModule } from '../audits/audits.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { CompetitorsModule } from '../competitors/competitors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Competitor]),
    forwardRef(() => BillingModule),
    forwardRef(() => AuditsModule),
    forwardRef(() => KeywordsModule),
    forwardRef(() => CompetitorsModule),
  ],
  providers: [ProjectsService, ProjectsOverviewService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
