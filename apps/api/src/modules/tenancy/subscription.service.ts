import { BillingCycle, BillingEventType, OrganizationLifecycleStatus, OrganizationStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { DomainEventsService } from '../notifications/domain-events.service';
import { BillingService } from './billing.service';
import { TenancyRepository } from './tenancy.repository';
import { AssignPlanInput, SubscriptionSnapshot } from './tenancy.types';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly tenancyRepository: TenancyRepository,
    private readonly billingService: BillingService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  listPlans() {
    return this.ensureDefaultPlans().then(() => this.tenancyRepository.listPlans());
  }

  async getSubscriptionSnapshot(organizationId: string): Promise<SubscriptionSnapshot | null> {
    await this.ensureDefaultPlans();
    const subscription = await this.tenancyRepository.findActiveSubscription(organizationId);
    if (!subscription) {
      return null;
    }

    return {
      organizationId,
      planCode: subscription.plan.code,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      featureFlags: this.toBooleanMap(subscription.plan.featureFlags, subscription.featureOverrides),
      usageLimits: this.toNumberMap(subscription.plan.usageLimits),
      trialEndsAt: subscription.trialEndsAt,
    };
  }

  async assignPlan(input: AssignPlanInput) {
    await this.ensureDefaultPlans();
    const plan = await this.tenancyRepository.findPlanByCode(input.planCode);
    if (!plan) {
      throw new NotFoundException(`Subscription plan ${input.planCode} not found.`);
    }

    const trialEndsAt = input.trialDays ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000) : null;
    const status = input.trialDays ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE;
    const subscription = await this.tenancyRepository.createSubscription({
      organizationId: input.organizationId,
      planId: plan.id,
      status,
      billingCycle: input.billingCycle ?? BillingCycle.MONTHLY,
      trialEndsAt,
      featureOverrides: Prisma.JsonNull,
    });

    await this.tenancyRepository.updateOrganization(input.organizationId, {
      status: OrganizationStatus.ACTIVE,
      lifecycleStatus: status === SubscriptionStatus.TRIALING ? OrganizationLifecycleStatus.TRIAL : OrganizationLifecycleStatus.ACTIVE_CUSTOMER,
    });

    await this.billingService.recordBillingEvent({
      organizationId: input.organizationId,
      subscriptionId: subscription.id,
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: `Subscription ${plan.name} assigned to organization.`,
      metadata: {
        planCode: plan.code,
        billingCycle: input.billingCycle ?? BillingCycle.MONTHLY,
        trialEndsAt,
      },
    });

    await this.domainEventsService.publish({
      organizationId: input.organizationId,
      eventType: 'billing.subscription_started',
      aggregateType: 'organization-subscription',
      aggregateId: subscription.id,
      payload: {
        planCode: plan.code,
        billingCycle: input.billingCycle ?? BillingCycle.MONTHLY,
        trialEndsAt,
      },
    });

    return subscription;
  }

  private async ensureDefaultPlans() {
    const existingPlans = await this.tenancyRepository.listPlans();
    if (existingPlans.length > 0) {
      return;
    }

    await Promise.all([
      this.tenancyRepository.createPlan({
        code: 'trial',
        name: 'Trial',
        description: 'Trial access for new organizations.',
        monthlyPrice: new Prisma.Decimal(0),
        yearlyPrice: new Prisma.Decimal(0),
        featureFlags: {
          ai_agents: true,
          executive_dashboards: true,
          advanced_workflows: true,
          integrations: true,
          analytics_exports: false,
          knowledge_graph: true,
          advanced_automation: false,
        } as Prisma.InputJsonValue,
        usageLimits: {
          agentRuns: 250,
          aiTokens: 250000,
          connectorCalls: 500,
          workflowExecutions: 1000,
          reportGenerations: 250,
        } as Prisma.InputJsonValue,
      }),
      this.tenancyRepository.createPlan({
        code: 'growth',
        name: 'Growth',
        description: 'Production multi-team plan.',
        monthlyPrice: new Prisma.Decimal(1499),
        yearlyPrice: new Prisma.Decimal(14990),
        featureFlags: {
          ai_agents: true,
          executive_dashboards: true,
          advanced_workflows: true,
          integrations: true,
          analytics_exports: true,
          knowledge_graph: true,
          advanced_automation: true,
        } as Prisma.InputJsonValue,
        usageLimits: {
          agentRuns: 5000,
          aiTokens: 2500000,
          connectorCalls: 25000,
          workflowExecutions: 50000,
          reportGenerations: 5000,
        } as Prisma.InputJsonValue,
      }),
      this.tenancyRepository.createPlan({
        code: 'enterprise',
        name: 'Enterprise',
        description: 'Enterprise unlimited feature profile.',
        monthlyPrice: new Prisma.Decimal(4999),
        yearlyPrice: new Prisma.Decimal(49990),
        featureFlags: {
          ai_agents: true,
          executive_dashboards: true,
          advanced_workflows: true,
          integrations: true,
          analytics_exports: true,
          knowledge_graph: true,
          advanced_automation: true,
        } as Prisma.InputJsonValue,
        usageLimits: {
          agentRuns: 50000,
          aiTokens: 25000000,
          connectorCalls: 250000,
          workflowExecutions: 500000,
          reportGenerations: 50000,
        } as Prisma.InputJsonValue,
      }),
    ]);
  }

  private toBooleanMap(base: Prisma.JsonValue | null, overrides: Prisma.JsonValue | null): Record<string, boolean> {
    const merged = {
      ...(base && typeof base === 'object' && !Array.isArray(base) ? (base as Record<string, unknown>) : {}),
      ...(overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? (overrides as Record<string, unknown>) : {}),
    };

    return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, Boolean(value)]));
  }

  private toNumberMap(value: Prisma.JsonValue | null): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, Number(entry ?? 0)]),
    );
  }
}
