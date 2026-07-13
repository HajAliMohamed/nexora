import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationLog } from './entities/automation-log.entity';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationProcessor } from './automation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, AutomationLog]),
    BullModule.registerQueue({ name: 'automation' }),
  ],
  providers: [AutomationService, AutomationProcessor],
  controllers: [AutomationController],
  exports: [AutomationService],
})
export class AutomationModule {}
