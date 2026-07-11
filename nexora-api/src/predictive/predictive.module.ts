import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PredictiveForecast } from './predictive-forecast.entity';
import { PredictiveService } from './predictive.service';
import { PredictiveController } from './predictive.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PredictiveForecast]), ConfigModule],
  providers: [PredictiveService],
  controllers: [PredictiveController],
  exports: [PredictiveService],
})
export class PredictiveModule {}
