import {
  Controller, Get, Post, Body, Req, Headers, UseGuards, HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../common/guards/auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { LimitsService } from './limits.service';
import { ProjectsService } from '../projects/projects.service';
import { RankTrackingService } from '../keywords/rank-tracking.service';
import { AuditsService } from '../audits/audits.service';
import { PLAN_LIMITS } from '../types/shared';
import Stripe from 'stripe';

@Controller()
export class BillingController {
  private stripe: Stripe | null = null;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly limitsService: LimitsService,
    private readonly projectsService: ProjectsService,
    private readonly rankTrackingService: RankTrackingService,
    private readonly auditsService: AuditsService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  @Get('me/usage')
  @UseGuards(AuthGuard)
  async getUsage(@Req() req: Request) {
    const userId = (req as any).user.id;
    const sub = await this.subscriptionsService.getActiveSubscription(userId);

    return {
      plan: sub.plan,
      limits: sub.limits,
      usage: {
        projects: await this.projectsService.countByUser(userId),
        keywords: await this.rankTrackingService.countKeywordsForUser(userId),
        auditsThisMonth: await this.auditsService.countAuditsThisMonthForUser(userId),
        keywordSearchesToday: 0,
      },
    };
  }

  @Post('billing/create-checkout-session')
  @UseGuards(AuthGuard)
  async createCheckoutSession(@Req() req: Request, @Body() body: { plan: string; success_url?: string }) {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const priceId = body.plan === 'agency'
      ? this.configService.get('STRIPE_AGENCY_PRICE_ID')
      : this.configService.get('STRIPE_PRO_PRICE_ID');

    const frontendUrl = this.configService.get('FRONTEND_URL');
    let successUrl = `${frontendUrl}/billing/success`;
    if (body.success_url) {
      try {
        const parsed = new URL(body.success_url);
        if (parsed.origin === new URL(frontendUrl).origin) {
          successUrl = body.success_url;
        }
      } catch { /* use default */ }
    }

    const session = await this.stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { userId },
      success_url: successUrl,
      cancel_url: `${frontendUrl}/billing`,
    });

    return { url: session.url! };
  }

  @Post('billing/create-portal-session')
  @UseGuards(AuthGuard)
  async createPortalSession(@Req() req: Request) {
    const userId = (req as any).user.id;
    const sub = await this.subscriptionsService.getActiveSubscription(userId);
    if (!sub.stripeCustomerId) {
      return { url: `${this.configService.get('FRONTEND_URL')}/billing` };
    }

    const session = await this.stripe!.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${this.configService.get('FRONTEND_URL')}/billing`,
    });

    return { url: session.url! };
  }

  @Post('billing/webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') sig: string,
  ) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: any;

    try {
      const raw = (req as any).rawBody;
      event = this.stripe!.webhooks.constructEvent(raw, sig, webhookSecret);
    } catch {
      return { received: true };
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription = await this.stripe!.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0].price.id;
        const plan = priceId === this.configService.get('STRIPE_AGENCY_PRICE_ID') ? 'agency' : 'pro';
        await this.subscriptionsService.upsertFromStripe({
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscription.id,
          plan,
          status: subscription.status,
          limits: PLAN_LIMITS[plan],
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          userId: session.metadata.userId || session.client_reference_id,
        });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0].price.id;
        const plan = priceId === this.configService.get('STRIPE_AGENCY_PRICE_ID') ? 'agency' : 'pro';
        await this.subscriptionsService.upsertFromStripe({
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          plan,
          status: subscription.status,
          limits: PLAN_LIMITS[plan],
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          userId: subscription.metadata.userId,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.subscriptionsService.upsertFromStripe({
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          plan: 'free',
          status: 'canceled',
          limits: PLAN_LIMITS.free,
          currentPeriodEnd: new Date(),
          userId: subscription.metadata.userId,
        });
        break;
      }
    }

    return { received: true };
  }
}
