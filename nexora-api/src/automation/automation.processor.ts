import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AutomationService } from './automation.service';

@Processor('automation')
export class AutomationProcessor extends WorkerHost {
  constructor(private readonly automationService: AutomationService) {
    super();
  }

  async process(job: Job<{ ruleId: string; projectId: string }>): Promise<any> {
    const rule = await this.automationService.getRule(job.data.ruleId);
    if (!rule || !rule.active) return;
    return this.automationService.executeRule(rule);
  }
}
