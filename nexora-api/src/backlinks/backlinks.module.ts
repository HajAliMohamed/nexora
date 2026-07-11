import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BacklinkOpportunity } from './entities/backlink-opportunity.entity';
import { BacklinkOutreach } from './entities/backlink-outreach.entity';
import { BacklinksService } from './backlinks.service';
import { BacklinksController } from './backlinks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BacklinkOpportunity, BacklinkOutreach]), ConfigModule],
  providers: [BacklinksService],
  controllers: [BacklinksController],
  exports: [BacklinksService],
})
export class BacklinksModule {}
