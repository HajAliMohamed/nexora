import { Module } from '@nestjs/common';
import { RedisModule } from '@songkeys/nestjs-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KeywordResearchService } from './keyword-research.service';
import { KeywordResearchController } from './keyword-research.controller';
import { BillingModule } from '../billing/billing.module';
import { KeywordsModule } from '../keywords/keywords.module';

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        config: { url: config.get('REDIS_URL') },
      }),
    }),
    BillingModule,
    KeywordsModule,
  ],
  providers: [KeywordResearchService],
  controllers: [KeywordResearchController],
})
export class KeywordResearchModule {}
