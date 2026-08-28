import {
  HealthCheckStatus,
  Prisma,
  PrismaClient,
  SystemAlertSeverity,
  SystemAlertStatus,
} from '@prisma/client';

import { deterministicPackUuid } from './deterministic-id';

export type ObservabilityEnrichmentProfile = 'core' | 'saas' | 'logistics' | 'revops';

export type ObservabilityEnrichmentResult = {
  systemAlerts: number;
  healthCheckLogs: number;
};

const PROFILE_ALERTS: Record<
  ObservabilityEnrichmentProfile,
  Array<{
    key: string;
    sourceModule: string;
    alertType: string;
    severity: SystemAlertSeverity;
    status: SystemAlertStatus;
    title: string;
    summary: string;
    metadata: Record<string, unknown>;
    hoursAgo: number;
  }>
> = {
  core: [
    {
      key: 'core-health',
      sourceModule: 'platform',
      alertType: 'platform.bootstrap.notice',
      severity: SystemAlertSeverity.INFO,
      status: SystemAlertStatus.OPEN,
      title: 'Core universal environment initialized',
      summary: 'The baseline universal company environment has been provisioned for demos.',
      metadata: { demo: true },
      hoursAgo: 2,
    },
  ],
  saas: [
    {
      key: 'support-escalation',
      sourceModule: 'support',
      alertType: 'support.escalation.risk',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.OPEN,
      title: 'Support escalation queue risk detected',
      summary: 'Escalation handling latency has risen above the SaaS demo threshold.',
      metadata: { queue: 'support-escalation', demo: true },
      hoursAgo: 3,
    },
    {
      key: 'connector-health',
      sourceModule: 'integrations',
      alertType: 'connector.sync.degraded',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.ACKNOWLEDGED,
      title: 'Customer messaging connector is degraded',
      summary: 'The team messaging connector reported intermittent delivery delays.',
      metadata: { connector: 'slack', demo: true },
      hoursAgo: 6,
    },
  ],
  logistics: [
    {
      key: 'readiness-alert',
      sourceModule: 'operations',
      alertType: 'operations.readiness.alert',
      severity: SystemAlertSeverity.CRITICAL,
      status: SystemAlertStatus.OPEN,
      title: 'Operational readiness dropped below target',
      summary: 'A readiness review found active issues in the logistics environment.',
      metadata: { scope: 'field-ops', demo: true },
      hoursAgo: 1,
    },
    {
      key: 'incident-load',
      sourceModule: 'incidents',
      alertType: 'incident.queue.elevated',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.OPEN,
      title: 'Incident handling load is elevated',
      summary: 'Open logistics incidents exceed the baseline coverage model.',
      metadata: { queue: 'ops-incidents', demo: true },
      hoursAgo: 4,
    },
  ],
  revops: [
    {
      key: 'discount-review',
      sourceModule: 'approvals',
      alertType: 'discount.approval.pending',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.OPEN,
      title: 'Discount review queue is elevated',
      summary: 'Revenue operations has pending discount requests awaiting action.',
      metadata: { queue: 'discount-approval', demo: true },
      hoursAgo: 2,
    },
    {
      key: 'crm-sync',
      sourceModule: 'integrations',
      alertType: 'crm.sync.warning',
      severity: SystemAlertSeverity.INFO,
      status: SystemAlertStatus.ACKNOWLEDGED,
      title: 'CRM sync latency elevated',
      summary: 'Revenue connectors remain healthy but latency is above baseline.',
      metadata: { connector: 'crm', demo: true },
      hoursAgo: 5,
    },
  ],
};

const PROFILE_HEALTH_CHECKS: Record<
  ObservabilityEnrichmentProfile,
  Array<{
    key: string;
    checkType: string;
    target: string;
    status: HealthCheckStatus;
    responseTimeMs: number;
    summary: string;
    metadata: Record<string, unknown>;
    hoursAgo: number;
  }>
> = {
  core: [
    {
      key: 'database',
      checkType: 'database.connectivity',
      target: 'database',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 18,
      summary: 'PostgreSQL connection is healthy.',
      metadata: { demo: true },
      hoursAgo: 1,
    },
  ],
  saas: [
    {
      key: 'support-automation',
      checkType: 'workflow.runtime.health',
      target: 'workflow-runtime',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 47,
      summary: 'SaaS workflow runtime is healthy.',
      metadata: { demo: true, module: 'support' },
      hoursAgo: 1,
    },
    {
      key: 'messaging',
      checkType: 'connectors.health',
      target: 'connectors',
      status: HealthCheckStatus.DEGRADED,
      responseTimeMs: 74,
      summary: 'Messaging connectors remain available with elevated latency.',
      metadata: { demo: true, profile: 'saas' },
      hoursAgo: 1,
    },
  ],
  logistics: [
    {
      key: 'ops-reporting',
      checkType: 'operations.reporting.health',
      target: 'ops-reporting',
      status: HealthCheckStatus.DEGRADED,
      responseTimeMs: 86,
      summary: 'Operations reporting feed is available with degraded throughput.',
      metadata: { demo: true, profile: 'logistics' },
      hoursAgo: 1,
    },
    {
      key: 'incident-intelligence',
      checkType: 'ai-runtime.health',
      target: 'ai-runtime',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 312,
      summary: 'Incident intelligence runtime is healthy.',
      metadata: { demo: true, profile: 'logistics' },
      hoursAgo: 2,
    },
  ],
  revops: [
    {
      key: 'crm-sync',
      checkType: 'connectors.health',
      target: 'crm-connectors',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 62,
      summary: 'Revenue connectors are healthy.',
      metadata: { demo: true, profile: 'revops' },
      hoursAgo: 1,
    },
    {
      key: 'approval-insights',
      checkType: 'intelligence.runtime.health',
      target: 'approval-insights',
      status: HealthCheckStatus.DEGRADED,
      responseTimeMs: 411,
      summary: 'Approval intelligence is available with elevated latency.',
      metadata: { demo: true, profile: 'revops' },
      hoursAgo: 2,
    },
  ],
};

export const seedObservabilityEnrichment = async (
  prisma: PrismaClient,
  input: {
    packNamespace: string;
    organizationId: string;
    profile: ObservabilityEnrichmentProfile;
    now: Date;
  },
): Promise<ObservabilityEnrichmentResult> => {
  const alerts = PROFILE_ALERTS[input.profile].map((alert) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:alert:${alert.key}`),
    organizationId: input.organizationId,
    sourceModule: alert.sourceModule,
    alertType: alert.alertType,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    summary: alert.summary,
    metadata: alert.metadata as Prisma.InputJsonValue,
    correlationId: `${input.packNamespace}:${alert.key}`,
    triggeredAt: new Date(input.now.getTime() - alert.hoursAgo * 60 * 60 * 1000),
    createdAt: new Date(input.now.getTime() - alert.hoursAgo * 60 * 60 * 1000),
    updatedAt: new Date(input.now.getTime() - alert.hoursAgo * 60 * 60 * 1000),
  }));

  const healthChecks = PROFILE_HEALTH_CHECKS[input.profile].map((check) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:health:${check.key}`),
    organizationId: input.organizationId,
    checkType: check.checkType,
    target: check.target,
    status: check.status,
    responseTimeMs: check.responseTimeMs,
    summary: check.summary,
    metadata: check.metadata as Prisma.InputJsonValue,
    checkedAt: new Date(input.now.getTime() - check.hoursAgo * 60 * 60 * 1000),
  }));

  await prisma.systemAlert.createMany({ data: alerts, skipDuplicates: true });
  await prisma.healthCheckLog.createMany({ data: healthChecks, skipDuplicates: true });

  return {
    systemAlerts: alerts.length,
    healthCheckLogs: healthChecks.length,
  };
};
