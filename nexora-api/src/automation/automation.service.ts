import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationLog } from './entities/automation-log.entity';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationLog)
    private readonly logRepo: Repository<AutomationLog>,
    @InjectQueue('automation') private readonly automationQueue: Queue,
  ) {}

  async getRule(id: string): Promise<AutomationRule | null> {
    return this.ruleRepo.findOne({ where: { id } });
  }

  async listRules(projectId: string): Promise<AutomationRule[]> {
    return this.ruleRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async createRule(projectId: string, userId: string, data: { name: string; triggerType: string; triggerConfig: Record<string, unknown>; actionType: string; actionConfig: Record<string, unknown> }): Promise<AutomationRule> {
    const rule = this.ruleRepo.create({ projectId, userId, ...data });
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: string, userId: string, data: Partial<AutomationRule>): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, userId } });
    if (!rule) throw new Error('Règle introuvable');
    Object.assign(rule, data);
    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string, userId: string): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id, userId } });
    if (!rule) throw new Error('Règle introuvable');
    await this.ruleRepo.remove(rule);
  }

  async getLogs(ruleId: string): Promise<AutomationLog[]> {
    return this.logRepo.find({ where: { ruleId }, order: { createdAt: 'DESC' }, take: 20 });
  }

  async executeRule(rule: AutomationRule): Promise<void> {
    this.logger.log(`Executing automation rule ${rule.id}: ${rule.actionType}`);
    const log = this.logRepo.create({
      ruleId: rule.id,
      projectId: rule.projectId,
      status: 'running',
    });
    await this.logRepo.save(log);

    try {
      let result: Record<string, unknown> = {};
      switch (rule.actionType) {
        case 'create_task':
          result = { taskId: `auto-task-${Date.now()}`, title: rule.actionConfig.title || 'Tâche automatique' };
          break;
        case 'send_alert':
          result = { alertId: `auto-alert-${Date.now()}`, message: rule.actionConfig.message || 'Alerte automatique' };
          break;
        default:
          result = { note: `Action ${rule.actionType} exécutée` };
      }
      rule.runCount++;
      await this.ruleRepo.save(rule);
      log.status = 'success';
      log.result = result;
    } catch (err) {
      log.status = 'failed';
      log.error = (err as Error).message;
    }
    await this.logRepo.save(log);
  }

  @Cron('*/30 * * * *')
  async scanTriggers(): Promise<void> {
    const activeRules = await this.ruleRepo.find({ where: { active: true } });
    this.logger.log(`Scanning triggers for ${activeRules.length} active rules`);
    for (const rule of activeRules) {
      await this.automationQueue.add('execute-rule', { ruleId: rule.id, projectId: rule.projectId });
    }
  }
}
