import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSearchSnapshot } from './entities/ai-search-snapshot.entity';
import { Project } from '../projects/entities/project.entity';
import { AiSearchService } from './ai-search.service';
import { AiSearchController } from './ai-search.controller';
import { AiSearchSnapshotsCron } from './crons/ai-search-snapshots.cron';

@Module({
  imports: [TypeOrmModule.forFeature([AiSearchSnapshot, Project])],
  providers: [AiSearchService, AiSearchSnapshotsCron],
  controllers: [AiSearchController],
  exports: [AiSearchService],
})
export class AiSearchModule {}
