import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ClientsService } from './clients.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { InviteClientDto } from './dto/client.dto';

@Controller('agencies/:agencyId/clients')
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly magicLinkService: MagicLinkService,
  ) {}

  @Post('invite')
  async invite(@Param('agencyId') agencyId: string, @Body() dto: InviteClientDto) {
    const client = await this.clientsService.invite(agencyId, dto);
    this.magicLinkService.generateToken(client.id, client.email).catch(() => {});
    return client;
  }

  @Get()
  async list(@Param('agencyId') agencyId: string) {
    return this.clientsService.listByAgency(agencyId);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    await this.clientsService.deactivate(id);
    return { ok: true };
  }

  @Patch(':clientId/projects/:projectId/assign')
  async assignProject(
    @Param('clientId') clientId: string,
    @Param('projectId') projectId: string,
  ) {
    await this.clientsService.assignProject(clientId, projectId);
    return { ok: true };
  }
}
