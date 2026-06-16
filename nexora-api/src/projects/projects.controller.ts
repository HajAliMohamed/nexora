import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { ProjectsService } from './projects.service';
import { ProjectsOverviewService } from './projects-overview.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly overviewService: ProjectsOverviewService,
  ) {}

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.projectsService.findAll(userId);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const userId = (req as any).user.id;
    return this.projectsService.create(userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Get(':id/overview')
  getOverview(@Param('id') id: string) {
    return this.overviewService.getOverview(id);
  }
}
