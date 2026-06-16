import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  list(@Req() req: Request, @Query('unreadOnly') unreadOnly?: string) {
    const userId = (req as any).user.id;
    return this.alertsService.listForUser(userId, { unreadOnly: unreadOnly === 'true' });
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.alertsService.markRead(id, userId);
  }

  @Get('unread-count')
  unreadCount(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.alertsService.getUnreadCount(userId).then(count => ({ count }));
  }
}
