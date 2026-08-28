import { HealthCheckStatus, SystemAlertSeverity, SystemAlertStatus } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import { addHours, DEMO_REFERENCE_DATE } from './helpers';
import type { CoreSeedContext, ObservabilitySeedResult } from './types';

export const seedObservability = async (context: CoreSeedContext): Promise<ObservabilitySeedResult> => {
  const { prisma, organizationId } = context;

  const alerts = [
    {
      id: deterministicUuid('system-alert:connector-failure'),
      organizationId,
      sourceModule: 'integrations',
      alertType: 'connector.sync.failure',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.OPEN,
      title: 'CRM connector sync failures detected',
      summary: 'The CRM demo connector has failed multiple sync attempts in the last 24 hours.',
      metadata: { connector: 'mock-crm', failures: 4 },
      correlationId: 'demo-observability-1',
      triggeredAt: addHours(DEMO_REFERENCE_DATE, -6),
      createdAt: addHours(DEMO_REFERENCE_DATE, -6),
      updatedAt: addHours(DEMO_REFERENCE_DATE, -6),
    },
    {
      id: deterministicUuid('system-alert:agent-failure'),
      organizationId,
      sourceModule: 'agents',
      alertType: 'agent.run.failure',
      severity: SystemAlertSeverity.CRITICAL,
      status: SystemAlertStatus.OPEN,
      title: 'Incident triage agent failure spike',
      summary: 'Incident triage agent runs failed above normal rate in the current window.',
      metadata: { agentCode: 'incident-triage-agent', failureRate: 0.33 },
      correlationId: 'demo-observability-2',
      triggeredAt: addHours(DEMO_REFERENCE_DATE, -2),
      createdAt: addHours(DEMO_REFERENCE_DATE, -2),
      updatedAt: addHours(DEMO_REFERENCE_DATE, -2),
    },
    {
      id: deterministicUuid('system-alert:action-blocked'),
      organizationId,
      sourceModule: 'actions',
      alertType: 'action.execution.failure',
      severity: SystemAlertSeverity.WARNING,
      status: SystemAlertStatus.ACKNOWLEDGED,
      title: 'Repeated action execution failures',
      summary: 'Several agent-proposed actions failed due to downstream mutation conflicts.',
      metadata: { actionType: 'CREATE_ASSIGNMENT', count: 3 },
      correlationId: 'demo-observability-3',
      triggeredAt: addHours(DEMO_REFERENCE_DATE, -8),
      createdAt: addHours(DEMO_REFERENCE_DATE, -8),
      updatedAt: addHours(DEMO_REFERENCE_DATE, -4),
    },
  ];

  const healthCheckLogs = [
    {
      id: deterministicUuid('health-check:db:1'),
      organizationId,
      checkType: 'database.connectivity',
      target: 'database',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 18,
      summary: 'PostgreSQL connection is healthy.',
      metadata: { replicaLagMs: 0 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -1),
    },
    {
      id: deterministicUuid('health-check:ai:1'),
      organizationId,
      checkType: 'ai-runtime.health',
      target: 'ai-runtime',
      status: HealthCheckStatus.DEGRADED,
      responseTimeMs: 742,
      summary: 'AI runtime latency is elevated but available.',
      metadata: { model: 'qwen2.5:7b-instruct', latencyMs: 742 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -1),
    },
    {
      id: deterministicUuid('health-check:connectors:1'),
      organizationId,
      checkType: 'connectors.health',
      target: 'connectors',
      status: HealthCheckStatus.DEGRADED,
      responseTimeMs: 54,
      summary: '4 connector instances active, 1 in error state.',
      metadata: { total: 4, errored: 1, disabled: 0 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -1),
    },
    {
      id: deterministicUuid('health-check:db:2'),
      organizationId,
      checkType: 'database.connectivity',
      target: 'database',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 21,
      summary: 'PostgreSQL connection is healthy.',
      metadata: { replicaLagMs: 0 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -6),
    },
    {
      id: deterministicUuid('health-check:ai:2'),
      organizationId,
      checkType: 'ai-runtime.health',
      target: 'ai-runtime',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 401,
      summary: 'AI runtime is healthy.',
      metadata: { model: 'qwen2.5:7b-instruct', latencyMs: 401 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -6),
    },
    {
      id: deterministicUuid('health-check:connectors:2'),
      organizationId,
      checkType: 'connectors.health',
      target: 'connectors',
      status: HealthCheckStatus.HEALTHY,
      responseTimeMs: 41,
      summary: 'All connector instances healthy.',
      metadata: { total: 4, errored: 0, disabled: 0 },
      checkedAt: addHours(DEMO_REFERENCE_DATE, -6),
    },
  ];

  await prisma.systemAlert.createMany({ data: alerts, skipDuplicates: true });
  await prisma.healthCheckLog.createMany({ data: healthCheckLogs, skipDuplicates: true });

  return {
    systemAlerts: alerts.length,
    healthCheckLogs: healthCheckLogs.length,
  };
};
