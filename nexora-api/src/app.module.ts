import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { BillingModule } from './billing/billing.module';
import { AuditsModule } from './audits/audits.module';
import { HealthController } from './common/health.controller';
import { KeywordsModule } from './keywords/keywords.module';
import { SerpModule } from './serp/serp.module';
import { KeywordResearchModule } from './keyword-research/keyword-research.module';
import { CompetitorsModule } from './competitors/competitors.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReportsModule } from './reports/reports.module';
import { AgenciesModule } from './agencies/agencies.module';
import { ClientsModule } from './clients/clients.module';
import { MagicLinkModule } from './magic-link/magic-link.module';
import { AiSearchModule } from './ai-search/ai-search.module';
import { GrowthEngineModule } from './growth-engine/growth-engine.module';
import { AssistantModule } from './assistant/assistant.module';
import { BrandingModule } from './branding/branding.module';
import { StrategyModule } from './strategy/strategy.module';
import { PredictiveModule } from './predictive/predictive.module';
import { AutomationModule } from './automation/automation.module';
import { ContentModule } from './content/content.module';
import { LandingModule } from './landing/landing.module';
import { BacklinksModule } from './backlinks/backlinks.module';
import { CrmModule } from './crm/crm.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL'),
        },
      }),
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    BillingModule,
    AuditsModule,
    KeywordsModule,
    SerpModule,
    KeywordResearchModule,
    CompetitorsModule,
    AlertsModule,
    ReportsModule,
    AgenciesModule,
    ClientsModule,
    MagicLinkModule,
    AiSearchModule,
    GrowthEngineModule,
    AssistantModule,
    StrategyModule,
    PredictiveModule,
    AutomationModule,
    ContentModule,
    LandingModule,
    BacklinksModule,
    CrmModule,
    MarketplaceModule,
    BrandingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
