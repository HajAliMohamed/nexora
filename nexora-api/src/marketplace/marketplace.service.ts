import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceItem } from './entities/marketplace-item.entity';
import { MarketplacePurchase } from './entities/marketplace-purchase.entity';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceItem)
    private readonly itemRepo: Repository<MarketplaceItem>,
    @InjectRepository(MarketplacePurchase)
    private readonly purchaseRepo: Repository<MarketplacePurchase>,
  ) {}

  async listItems(type?: string): Promise<MarketplaceItem[]> {
    const where: any = { active: true };
    if (type) where.type = type;
    return this.itemRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async purchaseItem(itemId: string, userId: string, agencyId?: string): Promise<MarketplacePurchase> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, active: true } });
    if (!item) throw new Error('Extension introuvable');
    const purchase = this.purchaseRepo.create({ itemId, userId, agencyId });
    return this.purchaseRepo.save(purchase);
  }

  async listPurchases(userId: string): Promise<MarketplacePurchase[]> {
    return this.purchaseRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
