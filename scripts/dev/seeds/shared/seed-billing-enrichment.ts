import {
  BillingCycle,
  BillingEventType,
  OrganizationLifecycleStatus,
  OrganizationStatus,
  Prisma,
  PrismaClient,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';

import { deterministicGlobalSeedUuid, deterministicPackUuid } from './deterministic-id';

export type BillingEnrichmentProfile = 'core' | 'saas' | 'logistics' | 'revops';

export type BillingEnrichmentResult = {
  subscriptionPlans: number;
  organizationSubscriptions: number;
  organizationUsage: number;
  organizationBillingEvents: number;
};

const PLAN_BLUEPRINTS = [
  {
    code: 'trial',
    name: 'Trial',
    description: 'Trial access for new organizations.',
    monthlyPrice: new Prisma.Decimal(0),
    yearlyPrice: new Prisma.Decimal(0),
    featureFlags: {
      ai_agents: true,
      integrations: true,
      advanced_workflows: true,
      analytics_exports: false,
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
    code: 'growth',
    name: 'Growth',
    description: 'Production multi-team plan.',
    monthlyPrice: new Prisma.Decimal(1499),
    yearlyPrice: new Prisma.Decimal(14990),
    featureFlags: {
      ai_agents: true,
      integrations: true,
      advanced_workflows: true,
      analytics_exports: true,
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
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Enterprise unlimited feature profile.',
    monthlyPrice: new Prisma.Decimal(4999),
    yearlyPrice: new Prisma.Decimal(49990),
    featureFlags: {
      ai_agents: true,
      integrations: true,
      advanced_workflows: true,
      analytics_exports: true,
      advanced_automation: true,
      executive_dashboards: true,
    },
    usageLimits: {
      agentRuns: 50000,
      aiTokens: 25000000,
      connectorCalls: 250000,
      workflowExecutions: 500000,
      reportGenerations: 50000,
    },
  },
] as const;

const PROFILE_PLAN_CODE: Record<BillingEnrichmentProfile, (typeof PLAN_BLUEPRINTS)[number]['code']> = {
  core: 'trial',
  saas: 'growth',
  logistics: 'enterprise',
  revops: 'growth',
};

const PROFILE_USAGE: Record<
  BillingEnrichmentProfile,
  Array<{ metricType: UsageMetricType; metricValue: number }>
> = {
  core: [
    { metricType: UsageMetricType.WORKFLOW_EXECUTIONS, metricValue: 12 },
    { metricType: UsageMetricType.REPORT_GENERATIONS, metricValue: 4 },
  ],
  saas: [
    { metricType: UsageMetricType.AGENT_RUNS, metricValue: 68 },
    { metricType: UsageMetricType.CONNECTOR_CALLS, metricValue: 142 },
    { metricType: UsageMetricType.REPORT_GENERATIONS, metricValue: 31 },
  ],
  logistics: [
    { metricType: UsageMetricType.AGENT_RUNS, metricValue: 74 },
    { metricType: UsageMetricType.CONNECTOR_CALLS, metricValue: 88 },
    { metricType: UsageMetricType.WORKFLOW_EXECUTIONS, metricValue: 129 },
  ],
  revops: [
    { metricType: UsageMetricType.CONNECTOR_CALLS, metricValue: 204 },
    { metricType: UsageMetricType.WORKFLOW_EXECUTIONS, metricValue: 58 },
    { metricType: UsageMetricType.REPORT_GENERATIONS, metricValue: 47 },
  ],
};

const PROFILE_BILLING_EVENTS: Record<
  BillingEnrichmentProfile,
  Array<{ eventType: BillingEventType; summary: string; metadata: Record<string, unknown>; dayOffset: number }>
> = {
  core: [
    {
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: 'Core universal baseline activated on trial plan.',
      metadata: { demo: true, planCode: 'trial' },
      dayOffset: -7,
    },
  ],
  saas: [
    {
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: 'Growth plan activated for SaaS demo environment.',
      metadata: { demo: true, planCode: 'growth' },
      dayOffset: -21,
    },
    {
      eventType: BillingEventType.USAGE_THRESHOLD_EXCEEDED,
      summary: 'Support workflow volume crossed the SaaS alert threshold.',
      metadata: { demo: true, metricType: UsageMetricType.WORKFLOW_EXECUTIONS, threshold: 0.8 },
      dayOffset: -2,
    },
  ],
  logistics: [
    {
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: 'Enterprise logistics environment activated.',
      metadata: { demo: true, planCode: 'enterprise' },
      dayOffset: -28,
    },
    {
      eventType: BillingEventType.USAGE_THRESHOLD_EXCEEDED,
      summary: 'Operational automation usage crossed the monitoring threshold.',
      metadata: { demo: true, metricType: UsageMetricType.AGENT_RUNS, threshold: 0.7 },
      dayOffset: -1,
    },
  ],
  revops: [
    {
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      summary: 'Growth plan activated for revenue operations environment.',
      metadata: { demo: true, planCode: 'growth' },
      dayOffset: -19,
    },
    {
      eventType: BillingEventType.USAGE_THRESHOLD_EXCEEDED,
      summary: 'Connector usage crossed the revops monitoring threshold.',
      metadata: { demo: true, metricType: UsageMetricType.CONNECTOR_CALLS, threshold: 0.75 },
      dayOffset: -3,
    },
  ],
};

export const seedBillingEnrichment = async (
  prisma: PrismaClient,
  input: {
    packNamespace: string;
    organizationId: string;
    profile: BillingEnrichmentProfile;
    now: Date;
  },
): Promise<BillingEnrichmentResult> => {
  await prisma.subscriptionPlan.createMany({
    data: PLAN_BLUEPRINTS.map((plan) => ({
      id: deterministicGlobalSeedUuid(`subscription-plan:${plan.code}`),
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      featureFlags: plan.featureFlags as Prisma.InputJsonValue,
      usageLimits: plan.usageLimits as Prisma.InputJsonValue,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      status: OrganizationStatus.ACTIVE,
      lifecycleStatus:
        input.profile === 'core'
          ? OrganizationLifecycleStatus.TRIAL
          : OrganizationLifecycleStatus.ACTIVE_CUSTOMER,
    },
  });

  const selectedPlanCode = PROFILE_PLAN_CODE[input.profile];
  const selectedPlanId = deterministicGlobalSeedUuid(`subscription-plan:${selectedPlanCode}`);
  const subscriptionId = deterministicPackUuid(input.packNamespace, 'enrichment:subscription');

  await prisma.organizationSubscription.upsert({
    where: { id: subscriptionId },
    update: {
      planId: selectedPlanId,
      status: input.profile === 'core' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
    },
    create: {
      id: subscriptionId,
      organizationId: input.organizationId,
      planId: selectedPlanId,
      status: input.profile === 'core' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      startsAt: new Date(input.now.getTime() - 1000 * 60 * 60 * 24 * 21),
      trialEndsAt:
        input.profile === 'core'
          ? new Date(input.now.getTime() + 1000 * 60 * 60 * 24 * 14)
          : null,
      featureOverrides: Prisma.JsonNull,
    },
  });

  const periodStart = new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1));
  const periodEnd = new Date(
    Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const usageRows = PROFILE_USAGE[input.profile].map((entry) => ({
    id: deterministicPackUuid(
      input.packNamespace,
      `enrichment:usage:${entry.metricType.toLowerCase()}`,
    ),
    organizationId: input.organizationId,
    metricType: entry.metricType,
    metricValue: entry.metricValue,
    periodStart,
    periodEnd,
    metadata: {
      seeded: true,
      source: 'seed-pack-enrichment',
      profile: input.profile,
    } as Prisma.InputJsonValue,
  }));

  await prisma.organizationUsage.createMany({ data: usageRows, skipDuplicates: true });

  const billingEvents = PROFILE_BILLING_EVENTS[input.profile].map((event, index) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:billing-event:${index + 1}`),
    organizationId: input.organizationId,
    subscriptionId,
    eventType: event.eventType,
    summary: event.summary,
    metadata: event.metadata as Prisma.InputJsonValue,
    occurredAt: new Date(input.now.getTime() + event.dayOffset * 24 * 60 * 60 * 1000),
  }));

  await prisma.organizationBillingEvent.createMany({
    data: billingEvents,
    skipDuplicates: true,
  });

  return {
    subscriptionPlans: PLAN_BLUEPRINTS.length,
    organizationSubscriptions: 1,
    organizationUsage: usageRows.length,
    organizationBillingEvents: billingEvents.length,
  };
};
