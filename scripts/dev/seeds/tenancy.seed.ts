import {
  BillingCycle,
  BillingEventType,
  OrganizationLifecycleStatus,
  OrganizationStatus,
  Prisma,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import type { CoreSeedContext, TenancySeedResult } from './types';

export const seedTenancy = async (context: CoreSeedContext): Promise<TenancySeedResult> => {
  const plans = [
    {
      id: deterministicUuid('subscription-plan:trial'),
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
      },
      usageLimits: {
        agentRuns: 250,
        aiTokens: 250000,
        connectorCalls: 500,
        workflowExecutions: 1000,
        reportGenerations: 250,
      },
    },
    {
      id: deterministicUuid('subscription-plan:growth'),
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
      },
      usageLimits: {
        agentRuns: 5000,
        aiTokens: 2500000,
        connectorCalls: 25000,
        workflowExecutions: 50000,
        reportGenerations: 5000,
      },
    },
    {
      id: deterministicUuid('subscription-plan:enterprise'),
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
      },
      usageLimits: {
        agentRuns: 50000,
        aiTokens: 25000000,
        connectorCalls: 250000,
        workflowExecutions: 500000,
        reportGenerations: 50000,
      },
    },
  ];

  await context.prisma.subscriptionPlan.createMany({
    data: plans,
    skipDuplicates: true,
  });

  await context.prisma.organization.update({
    where: { id: context.organizationId },
    data: {
      status: OrganizationStatus.ACTIVE,
      lifecycleStatus: OrganizationLifecycleStatus.ACTIVE_CUSTOMER,
    },
  });

  const subscriptionId = deterministicUuid(`organization-subscription:${context.organizationId}`);
  await context.prisma.organizationSubscription.createMany({
    data: [
      {
        id: subscriptionId,
        organizationId: context.organizationId,
        planId: plans[1].id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(context.now.getTime() - 1000 * 60 * 60 * 24 * 18),
        featureOverrides: Prisma.JsonNull,
      },
    ],
    skipDuplicates: true,
  });

  const usageRows = [
    {
      id: deterministicUuid(`org-usage:${context.organizationId}:agent-runs`),
      organizationId: context.organizationId,
      metricType: UsageMetricType.AGENT_RUNS,
      metricValue: 42,
    },
    {
      id: deterministicUuid(`org-usage:${context.organizationId}:connector-calls`),
      organizationId: context.organizationId,
      metricType: UsageMetricType.CONNECTOR_CALLS,
      metricValue: 27,
    },
    {
      id: deterministicUuid(`org-usage:${context.organizationId}:reports`),
      organizationId: context.organizationId,
      metricType: UsageMetricType.REPORT_GENERATIONS,
      metricValue: 18,
    },
  ].map((entry) => ({
    ...entry,
    periodStart: new Date(Date.UTC(context.now.getUTCFullYear(), context.now.getUTCMonth(), 1)),
    periodEnd: new Date(Date.UTC(context.now.getUTCFullYear(), context.now.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
    metadata: { seeded: true } as Prisma.InputJsonValue,
  }));

  await context.prisma.organizationUsage.createMany({
    data: usageRows,
    skipDuplicates: true,
  });

  const billingEvents = [
    {
      id: deterministicUuid(`org-billing-event:${context.organizationId}:started`),
      organizationId: context.organizationId,
      subscriptionId,
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: 'Growth subscription activated for demo organization.',
      metadata: { planCode: 'growth' } as Prisma.InputJsonValue,
      occurredAt: new Date(context.now.getTime() - 1000 * 60 * 60 * 24 * 18),
    },
    {
      id: deterministicUuid(`org-billing-event:${context.organizationId}:usage`),
      organizationId: context.organizationId,
      subscriptionId,
      eventType: BillingEventType.USAGE_THRESHOLD_EXCEEDED,
      summary: 'Demo threshold warning for connector calls.',
      metadata: { metricType: UsageMetricType.CONNECTOR_CALLS, threshold: 0.8 } as Prisma.InputJsonValue,
      occurredAt: new Date(context.now.getTime() - 1000 * 60 * 60 * 24 * 2),
    },
  ];

  await context.prisma.organizationBillingEvent.createMany({
    data: billingEvents,
    skipDuplicates: true,
  });

  return {
    subscriptionPlans: plans.length,
    organizationSubscriptions: 1,
    organizationUsage: usageRows.length,
    organizationBillingEvents: billingEvents.length,
  };
};
