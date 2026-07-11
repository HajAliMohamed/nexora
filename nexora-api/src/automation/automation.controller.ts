import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { AutomationService } from './automation.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/create-rule.dto';

@Controller('projects/:projectId/automation')
@UseGuards(AuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('rules')
  listRules(@Param('projectId') projectId: string) {
    return this.automationService.listRules(projectId);
  }

  @Post('rules')
  createRule(@Param('projectId') projectId: string, @Req() req: Request, @Body() dto: CreateRuleDto) {
    const userId = (req as any).user.id;
    return this.automationService.createRule(projectId, userId, dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Req() req: Request, @Body() dto: UpdateRuleDto) {
    const userId = (req as any).user.id;
    return this.automationService.updateRule(id, userId, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.automationService.deleteRule(id, userId);
  }

  @Get('rules/:id/logs')
  getLogs(@Param('id') id: string) {
    return this.automationService.getLogs(id);
  }
}
