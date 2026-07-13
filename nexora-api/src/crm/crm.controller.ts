import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CrmService } from './crm.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/create-task.dto';

@Controller('projects/:projectId/crm')
@UseGuards(AuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('tasks')
  createTask(@Param('projectId') projectId: string, @Req() req: Request, @Body() dto: CreateTaskDto) {
    const userId = (req as any).user.id;
    return this.crmService.createTask(projectId, userId, dto);
  }

  @Get('tasks')
  listTasks(@Param('projectId') projectId: string, @Query('status') status?: string) {
    return this.crmService.listTasks(projectId, status);
  }

  @Patch('tasks/:id/status')
  updateStatus(@Param('id') id: string, @Req() req: Request, @Body() dto: UpdateTaskStatusDto) {
    const userId = (req as any).user.id;
    return this.crmService.updateTaskStatus(id, userId, dto.status);
  }

}
