import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { StrategyService } from './strategy.service';
import { GenerateStrategyDto } from './dto/generate-strategy.dto';

@Controller('projects/:id/strategy')
@UseGuards(AuthGuard)
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Post('generate')
  async generate(@Param('id') id: string, @Body() dto: GenerateStrategyDto) {
    return this.strategyService.generateStrategy(id, {
      businessGoal: dto.businessGoal,
      horizonDays: dto.horizonDays,
    });
  }

  @Get()
  async getLatest(@Param('id') id: string) {
    return this.strategyService.getLatestStrategy(id);
  }
}
