import { Controller, Get, Post, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { MarketplaceService } from './marketplace.service';
import { PurchaseItemDto } from './dto/purchase-item.dto';

@Controller('marketplace')
@UseGuards(AuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('items')
  listItems(@Query('type') type?: string) {
    return this.marketplaceService.listItems(type);
  }

  @Post('items/:id/purchase')
  purchaseItem(@Param('id') id: string, @Req() req: Request, @Body() dto: PurchaseItemDto) {
    const userId = (req as any).user.id;
    return this.marketplaceService.purchaseItem(id, userId, dto.agencyId);
  }

  @Get('purchases')
  listPurchases(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.marketplaceService.listPurchases(userId);
  }
}
