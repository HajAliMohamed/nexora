import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrowthSignal } from './entities/growth-signal.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Project } from '../projects/entities/project.entity';
import { GrowthEngineService } from './growth-engine.service';
import { GrowthEngineController } from './growth-engine.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GrowthSignal, Keyword, KeywordPosition, Project])],
  providers: [GrowthEngineService],
  controllers: [GrowthEngineController],
  exports: [GrowthEngineService],
})
export class GrowthEngineModule {}
