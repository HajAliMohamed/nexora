import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Agency } from './entities/agency.entity';
import { AgencyMember } from './entities/agency-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Report } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, AgencyMember, Project, Report, User]),
    ConfigModule,
  ],
  providers: [AgenciesService],
  controllers: [AgenciesController],
  exports: [AgenciesService, TypeOrmModule],
})
export class AgenciesModule {}
