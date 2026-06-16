import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { SeoAlert } from './entities/seo-alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(SeoAlert)
    private readonly alertRepo: Repository<SeoAlert>,
  ) {}

  async createAlert(data: {
    userId: string;
    projectId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<SeoAlert> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recent = await this.alertRepo.find({
      where: {
        projectId: data.projectId,
        type: data.type,
        createdAt: MoreThan(oneDayAgo),
      },
    });

    const keyword = data.payload.keyword as string | undefined;
    if (keyword && recent.some(a => a.payload?.keyword === keyword)) {
      return recent.find(a => a.payload?.keyword === keyword)!;
    }

    const alert = this.alertRepo.create(data);
    return this.alertRepo.save(alert);
  }

  async listForUser(userId: string, opts?: { unreadOnly?: boolean }): Promise<SeoAlert[]> {
    const where: any = { userId };
    if (opts?.unreadOnly) {
      where.readAt = IsNull();
    }
    return this.alertRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert || alert.userId !== userId) {
      throw new NotFoundException('Alerte introuvable');
    }
    alert.readAt = new Date();
    await this.alertRepo.save(alert);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.alertRepo.count({
      where: { userId, readAt: IsNull() },
    });
  }
}
