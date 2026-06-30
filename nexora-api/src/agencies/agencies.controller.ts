import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto, InviteTeamMemberDto } from './dto/agency.dto';

@Controller('agencies')
@UseGuards(AuthGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateAgencyDto) {
    return this.agenciesService.create(req.user.id, dto);
  }

  @Get()
  async listMy(@Req() req: any) {
    const owned = await this.agenciesService.findByOwner(req.user.id);
    const memberOf = await this.agenciesService.findByMember(req.user.id);
    const all = new Map<string, any>();
    for (const a of [...owned, ...memberOf]) all.set(a.id, a);
    return Array.from(all.values());
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agenciesService.findById(id);
  }

  @Get(':id/reports')
  async getReports(@Param('id') id: string) {
    return this.agenciesService.getReports(id);
  }

  @Get(':id/projects')
  async getProjects(@Param('id') id: string) {
    return this.agenciesService.getProjects(id);
  }

  @Post(':id/projects')
  async createProject(@Param('id') id: string, @Req() req: any, @Body() body: { name: string; domain: string; countryCode?: string; languageCode?: string }) {
    return this.agenciesService.createProject(id, req.user.id, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateAgencyDto) {
    return this.agenciesService.update(id, req.user.id, dto);
  }

  @Get(':id/team')
  async getMembers(@Param('id') id: string) {
    return this.agenciesService.getMembers(id);
  }

  @Post(':id/team/invite')
  async inviteMember(@Param('id') id: string, @Body() dto: InviteTeamMemberDto) {
    return this.agenciesService.addMember(id, dto.email, dto.role);
  }

  @Delete(':id/team/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    await this.agenciesService.removeMember(memberId);
    return { ok: true };
  }
}
