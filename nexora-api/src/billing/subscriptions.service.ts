import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { PLAN_LIMITS } from '../types/shared';
import type { PlanLimits } from '../types/shared';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
  ) {}

  async createFree(userId: string): Promise<Subscription> {
    const sub = this.subRepo.create({
      userId,
      plan: 'free',
      limits: PLAN_LIMITS.free,
      status: 'active',
    });
    return this.subRepo.save(sub);
  }

  async getActiveSubscription(userId: string): Promise<Subscription> {
    let sub = await this.subRepo.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    if (!sub) {
      sub = await this.createFree(userId);
    }
    return sub;
  }

  async createSubscription(userId: string, plan: string): Promise<Subscription> {
    const sub = this.subRepo.create({
      userId,
      plan,
      limits: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
      status: 'active',
    });
    return this.subRepo.save(sub);
  }

  async upsertFromStripe(data: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    plan: string;
    status: string;
    limits: PlanLimits;
    currentPeriodEnd: Date;
    userId: string;
  }): Promise<void> {
    const existing = await this.subRepo.findOne({
      where: { userId: data.userId, stripeSubscriptionId: data.stripeSubscriptionId },
    });
    if (existing) {
      Object.assign(existing, data);
      await this.subRepo.save(existing);
    } else {
      await this.subRepo.save(this.subRepo.create(data));
    }
  }
}
