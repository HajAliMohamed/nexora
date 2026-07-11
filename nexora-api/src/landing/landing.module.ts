import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LandingPage } from './entities/landing-page.entity';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage]), ConfigModule],
  providers: [LandingService],
  controllers: [LandingController],
  exports: [LandingService],
})
export class LandingModule {}
