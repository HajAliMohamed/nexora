import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PredictiveService } from './predictive.service';
import { GenerateForecastDto } from './dto/generate-forecast.dto';

@Controller('projects/:id/predictive')
@UseGuards(AuthGuard)
export class PredictiveController {
  constructor(private readonly predictiveService: PredictiveService) {}

  @Post('generate')
  async generate(
    @Param('id') id: string,
    @Body() dto: GenerateForecastDto,
  ) {
    return this.predictiveService.generateForecast(
      id,
      dto.metricType,
      dto.history,
      dto.horizonDays,
    );
  }

  @Get()
  async getLatest(
    @Param('id') id: string,
    @Query('metricType') metricType: string,
  ) {
    if (!metricType) {
      return { error: 'metricType query parameter is required' };
    }
    return this.predictiveService.getLatestForecast(id, metricType);
  }
}
