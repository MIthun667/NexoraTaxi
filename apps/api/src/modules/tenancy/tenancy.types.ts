import { BillingCycle, BillingEventType, OrganizationLifecycleStatus, SubscriptionStatus, UsageMetricType } from '@prisma/client';

export type PlatformFeatureKey =
  | 'ai_agents'
  | 'executive_dashboards'
  | 'advanced_workflows'
  | 'integrations'
  | 'analytics_exports'
  | 'knowledge_graph'
  | 'advanced_automation';

export interface FeatureAccessResult {
  enabled: boolean;
  reason?: string;
}

export interface ProvisionOrganizationInput {
  organizationName: string;
  organizationSlug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  passwordHash: string;
  generateDemoData?: boolean;
}

export interface AssignPlanInput {
  organizationId: string;
  planCode: string;
  billingCycle?: BillingCycle;
  trialDays?: number;
}

export interface RecordUsageInput {
  organizationId: string;
  metricType: UsageMetricType;
  metricValue?: number;
  occurredAt?: Date;
  metadata?: Record<string, unknown> | null;
}

export interface RecordBillingEventInput {
  organizationId: string;
  subscriptionId?: string | null;
  eventType: BillingEventType;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

export interface SubscriptionSnapshot {
  organizationId: string;
  planCode: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  featureFlags: Record<string, boolean>;
  usageLimits: Record<string, number>;
  trialEndsAt?: Date | null;
}

export interface OrganizationLifecycleSnapshot {
  organizationId: string;
  status: string;
  lifecycleStatus: OrganizationLifecycleStatus;
}
