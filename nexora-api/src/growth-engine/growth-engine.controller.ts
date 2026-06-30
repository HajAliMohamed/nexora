import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { GrowthEngineService } from './growth-engine.service';

@Controller('projects/:id/growth')
@UseGuards(AuthGuard)
export class GrowthEngineController {
  constructor(private readonly growthEngineService: GrowthEngineService) {}

  @Get()
  async getGrowthSignals(@Param('id') id: string) {
    return this.growthEngineService.getGrowthSignals(id);
  }
}
