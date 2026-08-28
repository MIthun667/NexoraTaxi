'use client';

import { Activity, Bot, CircleDollarSign, PlugZap, ServerCog } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useAiOverview } from '@/hooks/queries/use-ai-command-center';
import { useDashboardAlerts } from '@/hooks/queries/use-dashboard-overview';
import { useObservabilitySummary, usePlatformHealth } from '@/hooks/queries/use-observability';
import { useAuth } from '@/hooks/use-auth';
import { formatNumber } from '@/lib/utils';

type SharedPlatformWidgetsGridProps = {
  variant?: 'dashboard' | 'executive';
};

export function SharedPlatformWidgetsGrid({
  variant = 'dashboard',
}: SharedPlatformWidgetsGridProps) {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const selectedOrganizationId = activeContext.selectedOrganizationId;
  const isTenantScopedTelemetry =
    Boolean(selectedOrganizationId) && selectedOrganizationId === user?.organizationId;

  const alerts = useDashboardAlerts(selectedOrganizationId);
  const aiOverview = useAiOverview();
  const observabilitySummary = useObservabilitySummary(isTenantScopedTelemetry);
  const platformHealth = usePlatformHealth(isTenantScopedTelemetry);

  const billingCopy = getBillingCopy(activeContext.config.archetype, selectedOrganizationId);
  const connectorCopy = getConnectorCopy(activeContext.config.archetype);
  const systemCopy = getSystemCopy(activeContext.config.archetype);
  const aiCopy = getAiCopy(activeContext.config.archetype);

  return (
    <div className={variant === 'executive' ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4 xl:grid-cols-2 2xl:grid-cols-4'}>
      <SectionCard
        eyebrow="Tenancy / billing"
        title={billingCopy.title}
        description={billingCopy.description}
      >
        <WidgetMetric
          label="Subscription posture"
          value={selectedOrganizationId ? 'Baseline subscription active' : 'Multi-tenant organization scope'}
          icon={CircleDollarSign}
        />
        <WidgetDetail
          label="Usage visibility"
          value={
            selectedOrganizationId
              ? 'Detailed usage telemetry is not exposed in current dashboard APIs.'
              : 'Select a specific tenant to align usage posture with one environment.'
          }
        />
        <WidgetDetail label="Current scope" value={activeContext.scopeLabel} />
      </SectionCard>

      <SectionCard
        eyebrow="Connectors"
        title={connectorCopy.title}
        description={connectorCopy.description}
      >
        {isTenantScopedTelemetry && platformHealth.data ? (
          <>
            <WidgetMetric
              label="Connector status"
              value={platformHealth.data.checks.connectors.status}
              icon={PlugZap}
            />
            <WidgetDetail
              label="Health summary"
              value={platformHealth.data.checks.connectors.summary}
            />
            <WidgetDetail
              label="Sync posture"
              value={`${formatConnectorCount(platformHealth.data.checks.connectors.metadata?.total)} tracked connector instance(s) in current tenant scope.`}
            />
          </>
        ) : (
          <>
            <WidgetMetric
              label="Connector posture"
              value={selectedOrganizationId ? 'Connector telemetry not scoped here' : 'Universal connector overview'}
              icon={PlugZap}
            />
            <WidgetDetail label="Status" value={connectorCopy.fallback} />
            <WidgetDetail
              label="Scope note"
              value={
                selectedOrganizationId
                  ? 'Detailed connector health follows the authenticated tenant scope in the current API surface.'
                  : 'Use tenant-specific scope to inspect connector health when available.'
              }
            />
          </>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Observability"
        title={systemCopy.title}
        description={systemCopy.description}
      >
        <WidgetMetric
          label="Alert posture"
          value={alerts.data ? `${formatNumber(alerts.data.totalAlerts)} active` : 'No active alerts'}
          icon={ServerCog}
        />
        <WidgetDetail
          label="System health"
          value={
            isTenantScopedTelemetry && platformHealth.data
              ? `${platformHealth.data.overallStatus} · ${platformHealth.data.checks.database.summary}`
              : systemCopy.fallback
          }
        />
        <WidgetDetail
          label="Platform signal"
          value={
            isTenantScopedTelemetry && observabilitySummary.data
              ? `${formatNumber(observabilitySummary.data.criticalAlerts)} critical alerts, ${formatNumber(observabilitySummary.data.connectorFailures24h)} connector failures in the last 24h.`
              : selectedOrganizationId
                ? 'Scoped alerts remain available even when deeper health checks are not tenant-switchable.'
                : 'Universal mode favors a neutral platform-health narrative across tenants.'
          }
        />
      </SectionCard>

      <SectionCard
        eyebrow="AI runtime"
        title={aiCopy.title}
        description={aiCopy.description}
      >
        {aiOverview.data ? (
          <>
            <WidgetMetric
              label="Recent AI activity"
              value={`${formatNumber(aiOverview.data.activity.agentRunsToday)} runs today`}
              icon={Bot}
            />
            <WidgetDetail
              label="Automation flow"
              value={`${formatNumber(aiOverview.data.activity.actionsExecuted)} actions executed · ${formatNumber(aiOverview.data.activity.approvalsRequired)} approvals required.`}
            />
            <WidgetDetail
              label="Latest signal"
              value={
                aiOverview.data.recentDecisions[0]
                  ? `${aiOverview.data.recentDecisions[0].agentName}: ${aiOverview.data.recentDecisions[0].summary}`
                  : aiCopy.fallback
              }
            />
          </>
        ) : (
          <>
            <WidgetMetric label="AI runtime" value="No recent AI activity" icon={Activity} />
            <WidgetDetail label="Runtime note" value={aiCopy.fallback} />
          </>
        )}
      </SectionCard>
    </div>
  );
}

function WidgetMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-[var(--brand-500)]" />
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function WidgetDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-300">{value}</p>
    </div>
  );
}

function formatConnectorCount(value: unknown) {
  return typeof value === 'number' ? formatNumber(value) : '0';
}

function getBillingCopy(archetype: string, scopedOrganizationId?: string) {
  if (!scopedOrganizationId) {
    return {
      title: 'Subscription posture across organizations',
      description:
        'Keep the universal platform shell clear while showing that tenancy and billing posture exist behind the environments.',
    };
  }

  if (archetype === 'SAAS') {
    return {
      title: 'Customer-facing subscription posture',
      description:
        'Billing and usage context frame the SaaS active as a service-delivery organization without requiring a dedicated billing UI.',
    };
  }

  if (archetype === 'LOGISTICS') {
    return {
      title: 'Operational usage posture',
      description:
        'Subscription context anchors the logistics active without overpowering readiness and execution signals.',
    };
  }

  if (archetype === 'REVOPS') {
    return {
      title: 'Revenue control subscription posture',
      description:
        'Billing posture supports the RevOps story while keeping approval and connector controls at the center.',
    };
  }

  return {
    title: 'Baseline platform subscription',
    description:
      'CORE keeps tenancy light and universal, showing that the platform supports subscription-aware organizations.',
  };
}

function getConnectorCopy(archetype: string) {
  if (archetype === 'SAAS') {
    return {
      title: 'Customer systems and collaboration connectors',
      description:
        'Track readiness for communication, support, and service-delivery integrations.',
      fallback: 'Connector coverage is available, but this scope does not expose detailed sync health.',
    };
  }

  if (archetype === 'LOGISTICS') {
    return {
      title: 'Operations reporting and control connectors',
      description:
        'Surface the readiness of integrations that support operational reporting and coordination.',
      fallback: 'Connector telemetry will appear when tenant-scoped health checks are available.',
    };
  }

  if (archetype === 'REVOPS') {
    return {
      title: 'Revenue systems and go-to-market connectors',
      description:
        'Show the readiness of CRM, marketing, and revenue-control integrations.',
      fallback: 'Connector freshness is not exposed in this scope, so the widget stays descriptive.',
    };
  }

  return {
    title: 'Platform integration posture',
    description:
      'Use a compact connector-health view to show that the platform supports integration-aware operations.',
    fallback: 'No active connector telemetry is available in the current scope.',
  };
}

function getSystemCopy(archetype: string) {
  if (archetype === 'SAAS') {
    return {
      title: 'Service health and escalation posture',
      description:
        'Blend incident, alert, and runtime signals into a clean service-health readout.',
      fallback: 'No critical service-health degradation is visible in the current scope.',
    };
  }

  if (archetype === 'LOGISTICS') {
    return {
      title: 'Readiness and incident posture',
      description:
        'Surface the health and alert signals that matter most to operations-heavy environments.',
      fallback: 'The operating environment appears stable with no major readiness degradation signaled.',
    };
  }

  if (archetype === 'REVOPS') {
    return {
      title: 'Control health and pipeline posture',
      description:
        'Track approval, alert, and connector pressure through a compact system-health lens.',
      fallback: 'The current revenue-control scope is stable and not showing active system-health degradation.',
    };
  }

  return {
    title: 'Platform health and alert posture',
    description:
      'A universal health view keeps the command center grounded in system posture, not just workflow volume.',
    fallback: 'System health appears stable and no platform degradation was detected.',
  };
}

function getAiCopy(archetype: string) {
  if (archetype === 'SAAS') {
    return {
      title: 'AI runtime for customer delivery',
      description:
        'Show how AI activity supports escalation handling, service delivery, and customer response.',
      fallback: 'No recent AI delivery activity is available in the current runtime feed.',
    };
  }

  if (archetype === 'LOGISTICS') {
    return {
      title: 'AI runtime for operations control',
      description:
        'Surface recent automation activity tied to readiness, coverage, and operational intervention.',
      fallback: 'No recent AI operations-control activity is available in the current runtime feed.',
    };
  }

  if (archetype === 'REVOPS') {
    return {
      title: 'AI runtime for approvals and revenue controls',
      description:
        'Use AI runtime activity to reinforce the decision-support and approval narrative for RevOps actives.',
      fallback: 'No recent AI decision-support activity is available in the current runtime feed.',
    };
  }

  return {
    title: 'AI runtime activity',
    description:
      'A compact runtime widget shows the platform’s AI layer without taking over the whole command surface.',
    fallback: 'No recent AI runtime activity is available in the current feed.',
  };
}
