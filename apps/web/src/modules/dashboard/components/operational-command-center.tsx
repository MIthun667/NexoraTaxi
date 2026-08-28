'use client';

import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  HardHat,
  ShieldAlert,
  Siren,
  Users,
  Wrench,
} from 'lucide-react';

import { AlertsPanel } from '@/components/layout/alerts-panel';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useAiOverview } from '@/hooks/queries/use-ai-command-center';
import { useAgentProposals } from '@/hooks/queries/use-ai-command-center';
import {
  useDashboardAlerts,
  useDashboardApprovalsSummary,
  useDashboardIncidentTrends,
  useDashboardOverview,
  useDashboardOperationsSummary,
  useDashboardOperationsTrends,
  useDashboardOperatorsSummary,
  useDashboardAssetsSummary,
  useDashboardWorkforceSummary,
  useDashboardWorkforceTrends,
  useDashboardWorkflowsSummary,
} from '@/hooks/queries/use-dashboard-overview';
import { useObservabilitySummary, usePlatformHealth } from '@/hooks/queries/use-observability';
import { useAuth } from '@/hooks/use-auth';
import { buildOperationalIntelligence } from '@/lib/command-intelligence';
import type { IntelligenceActionItem } from '@/lib/command-intelligence';
import { formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';

import { AiInsightCard } from './ai-insight-card';
import { AnalyticsSignalDeck } from './analytics-signal-deck';
import { AgentExecutionPanel } from './agent-execution-panel';
import { IntelligenceSummaryBanner } from './intelligence-summary-banner';
import { OperationalPrioritiesPanel } from './operational-priorities-panel';
import { RecommendedActionsList } from './recommended-actions-list';
import { RiskOpportunityStrip } from './risk-opportunity-strip';
import { SharedPlatformWidgetsGrid } from './shared-platform-widgets-grid';
import { SignalBarList } from './signal-bar-list';

export function OperationalCommandCenter() {
  const demoContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = demoContext.selectedOrganizationId;
  const agentScopeOrganizationId = organizationId ?? user?.organizationId ?? undefined;
  const isTenantScopedTelemetry = Boolean(organizationId) && organizationId === user?.organizationId;
  const overview = useDashboardOverview(organizationId);
  const workforceSummary = useDashboardWorkforceSummary(organizationId);
  const operatorsSummary = useDashboardOperatorsSummary(organizationId);
  const assetsSummary = useDashboardAssetsSummary(organizationId);
  const operationsSummary = useDashboardOperationsSummary(organizationId);
  const approvalsSummary = useDashboardApprovalsSummary(organizationId);
  const workflowsSummary = useDashboardWorkflowsSummary(organizationId);
  const alerts = useDashboardAlerts(organizationId);
  const workforceTrends = useDashboardWorkforceTrends(30, organizationId);
  const operationsTrends = useDashboardOperationsTrends(30, organizationId);
  const incidentTrends = useDashboardIncidentTrends(30, organizationId);
  const aiOverview = useAiOverview();
  const agentProposals = useAgentProposals(
    agentScopeOrganizationId
      ? {
          page: 1,
          limit: 3,
          organizationId: agentScopeOrganizationId,
        }
      : undefined,
  );
  const observabilitySummary = useObservabilitySummary(isTenantScopedTelemetry);
  const platformHealth = usePlatformHealth(isTenantScopedTelemetry);

  const queries = [
    overview,
    workforceSummary,
    operatorsSummary,
    assetsSummary,
    operationsSummary,
    approvalsSummary,
    workflowsSummary,
    alerts,
    workforceTrends,
    operationsTrends,
    incidentTrends,
    aiOverview,
    observabilitySummary,
    platformHealth,
  ];

  if (queries.some((query) => query.isLoading)) {
    return (
      <LoadingState
        title="Loading Operational Command Center..."
        description="Assembling workforce, assets, work execution, incidents, and AI-assisted operational risk signals."
      />
    );
  }

  if (queries.some((query) => query.isError)) {
    return (
      <ErrorState
        title="Unable to load the Operational Command Center."
        description="One or more live operational summary endpoints did not return successfully."
        onRetry={() => queries.forEach((query) => query.refetch())}
      />
    );
  }

  const availableWorkforce =
    (operatorsSummary.data?.totals.availableOperators ?? 0) + (workforceSummary.data?.totals.activeEmployees ?? 0);
  const activeWorkOrders = operationsSummary.data?.totals.activeWorkOrders ?? 0;
  const openIncidents = operationsSummary.data?.totals.openIncidents ?? 0;
  const assetsOperational = assetsSummary.data?.totals.operationallyReadyAssets ?? 0;
  const assignmentsActive = operationsSummary.data?.totals.activeAssignments ?? 0;
  
  // Use real AI verification rate from backend.
  const verificationSuccessRate = Math.round((aiOverview.data?.activity.verificationSuccessRate ?? 0) * 100);

  const assetReadinessRate = percentage(
    assetsSummary.data?.totals.operationallyReadyAssets ?? 0,
    assetsSummary.data?.totals.totalAssets ?? 0,
  );
  const shiftCoverageRate = percentage(
    operationsSummary.data?.totals.activeAssignments ?? 0,
    operationsSummary.data?.totals.activeShiftsToday ?? 0,
  );

  const recentActivity = [
    {
      label: 'New work orders',
      value: sumTrend(operationsTrends.data?.workOrdersStarted ?? []),
    },
    {
      label: 'Assignments created',
      value: sumTrend(operationsTrends.data?.assignmentsCreated ?? []),
    },
    {
      label: 'Incidents escalated',
      value: sumSeverityMix(incidentTrends.data?.severityMix ?? [], ['HIGH', 'CRITICAL']),
    },
  ];

  const aiInsights = deriveOperationalInsights({
    activeShiftsToday: operationsSummary.data?.totals.activeShiftsToday ?? 0,
    activeAssignments: operationsSummary.data?.totals.activeAssignments ?? 0,
    openIncidents,
    overdueMaintenance: assetsSummary.data?.totals.overdueMaintenanceCount ?? 0,
    expiringComplianceArtifacts: assetsSummary.data?.totals.expiringComplianceArtifacts ?? 0,
    availableWorkforce,
    nonCompliantOperators: operatorsSummary.data?.totals.nonCompliantOperators ?? 0,
  });

  const intelligence = buildOperationalIntelligence({
    openIncidents,
    activeAssignments: operationsSummary.data?.totals.activeAssignments ?? 0,
    activeShiftsToday: operationsSummary.data?.totals.activeShiftsToday ?? 0,
    pendingApprovalRequests: approvalsSummary.data?.totals.pendingApprovalRequests ?? 0,
    overdueApprovalSteps: approvalsSummary.data?.totals.overdueApprovalSteps ?? 0,
    pendingTasks: workflowsSummary.data?.totals.pendingTasks ?? 0,
    escalatedTasks: workflowsSummary.data?.totals.escalatedTasks ?? 0,
    assetReadinessRate,
    overdueMaintenance: assetsSummary.data?.totals.overdueMaintenanceCount ?? 0,
    expiringComplianceArtifacts: assetsSummary.data?.totals.expiringComplianceArtifacts ?? 0,
    availableOperators: operatorsSummary.data?.totals.availableOperators ?? 0,
    nonCompliantOperators: operatorsSummary.data?.totals.nonCompliantOperators ?? 0,
    activeWorkOrders,
    alertCount: alerts.data?.totalAlerts ?? 0,
    aiOverview: aiOverview.data,
    observabilitySummary: observabilitySummary.data,
    platformHealth: platformHealth.data,
    isTenantScopedTelemetry,
  });
  const liveAgentActions: IntelligenceActionItem[] =
    agentScopeOrganizationId && agentProposals.data
      ? agentProposals.data.items.slice(0, 3).map((proposal) => ({
          id: `proposal-${proposal.id}`,
          label: proposal.summary,
          reason: `${proposal.agentName} proposed ${proposal.actionType} for ${proposal.targetEntityType ?? 'the current operating scope'}.`,
          href: '/ai/proposals',
          urgency:
            proposal.riskLevel === 'CRITICAL' || proposal.riskLevel === 'HIGH'
              ? ('Immediate' as const)
              : proposal.riskLevel === 'MEDIUM'
                ? ('Next' as const)
                : ('Monitor' as const),
          sourceAgent: proposal.agentName,
          sourceAgentCode: proposal.agentCode ?? undefined,
          actionType: proposal.actionType,
          proposalId: proposal.id,
          targetEntityType: proposal.targetEntityType,
          targetEntityId: proposal.targetEntityId,
          executionStatus: proposal.executionStatus ?? null,
          approvalRequestId: proposal.approvalRequestId ?? null,
          executionSummary: proposal.executionSummary ?? null,
          organizationId: proposal.organizationId ?? null,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
          status:
            proposal.status === 'REJECTED'
              ? 'DISMISSED'
              : proposal.executionStatus === 'PENDING_APPROVAL' || proposal.approvalRequestId
                ? 'SENT_TO_APPROVAL'
                : proposal.executionStatus === 'SUCCEEDED'
                  ? proposal.actionType === 'CREATE_WORKFLOW_TASK'
                    ? 'SENT_TO_WORKFLOW'
                    : 'EXECUTED'
                  : 'PENDING',
          detail:
            !organizationId && user?.organizationId
              ? `Reviewing proposals in the current authenticated tenant while the dashboard remains in global management mode.`
              : undefined,
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={demoContext.config.eyebrow}
        title={demoContext.config.heroTitle}
        description={demoContext.config.heroDescription}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          title="Active work orders"
          value={activeWorkOrders}
          description="Currently active operational tasks and work orders in flight."
          icon={HardHat}
        />
        <MetricCard
          title="Open incidents"
          value={openIncidents}
          description="Operational incidents currently unresolved across the organization."
          icon={Siren}
        />
        <MetricCard
          title="Available workforce"
          value={availableWorkforce}
          description="Combined operator availability and active employee pool."
          icon={Users}
        />
        <MetricCard
          title="Assets operational"
          value={assetsOperational}
          description={`${assetReadinessRate}% of tracked assets are currently operationally ready.`}
          icon={Activity}
        />
        <MetricCard
          title="Assignments active"
          value={assignmentsActive}
          description={`${shiftCoverageRate}% current shift coverage against active demand.`}
          icon={BriefcaseBusiness}
        />
        <MetricCard
          title="Verification Success"
          value={verificationSuccessRate}
          suffix="%"
          description="Live AI-assisted execution quality signal."
          icon={CheckCircle2}
        />
      </div>

      <IntelligenceSummaryBanner data={intelligence.banner} />

      <RiskOpportunityStrip items={intelligence.strip} />

      <AgentExecutionPanel
        title="AI agents"
        description="Run the workforce, operations, and revenue agents from the active execution scope."
      />

      <AnalyticsSignalDeck
        archetypeLabel={demoContext.config.shortLabel}
        workforceTrends={workforceTrends.data}
        operationsTrends={operationsTrends.data}
        incidentTrends={incidentTrends.data}
        approvalsSummary={approvalsSummary.data}
        aiOverview={aiOverview.data}
        availableOperators={availableWorkforce}
        requiredCoverage={operationsSummary.data?.totals.activeShiftsToday ?? 0}
      />

      <SharedPlatformWidgetsGrid variant="dashboard" />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <OperationalPrioritiesPanel items={intelligence.priorities} />
        <RecommendedActionsList
          title="Reviewable actions"
          description={
            agentScopeOrganizationId
              ? 'Human-reviewed actions only.'
              : 'Evidence-linked actions only.'
          }
          items={[...liveAgentActions, ...intelligence.actions].slice(0, 5)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          eyebrow="Operational posture"
          title={demoContext.config.postureTitle}
          description={demoContext.config.postureDescription}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatBlock label="Workforce active" value={workforceSummary.data?.totals.activeEmployees ?? 0} sublabel="Employees in active employment state" />
            <StatBlock label="Shift coverage" value={shiftCoverageRate} sublabel="Active assignments compared to today's active shifts" suffix="%" />
            <StatBlock label="Asset readiness" value={assetReadinessRate} sublabel="Operationally ready assets as a share of total managed assets" suffix="%" />
            <StatBlock label="Approval backlog" value={approvalsSummary.data?.totals.pendingApprovalRequests ?? 0} sublabel="Requests likely to slow execution" />
          </div>
        </SectionCard>

        <AlertsPanel
          alerts={(alerts.data?.items ?? []).slice(0, 6)}
          eyebrow="Alert posture"
          title={demoContext.config.alertTitle}
          description={demoContext.config.alertDescription}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          eyebrow="Workforce operations"
          title={demoContext.config.workforceTitle}
          description={demoContext.config.workforceDescription}
        >
          <SignalBarList
            items={[
              { label: 'Available operators', value: operatorsSummary.data?.totals.availableOperators ?? 0, tone: 'success' },
              { label: 'Assignment-ready operators', value: operatorsSummary.data?.totals.dispatchEligibleOperators ?? 0, tone: 'info' },
              { label: 'Onboarding employees', value: workforceSummary.data?.totals.onboardingEmployees ?? 0 },
              { label: 'Leave of absence', value: workforceSummary.data?.totals.leaveOfAbsenceEmployees ?? 0, tone: 'danger' },
            ]}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Asset operations"
          title={demoContext.config.assetsTitle}
          description={demoContext.config.assetsDescription}
        >
          <SignalBarList
            items={[
              { label: 'Operationally ready', value: assetsSummary.data?.totals.operationallyReadyAssets ?? 0, tone: 'success' },
              { label: 'Available assets', value: assetsSummary.data?.totals.availableAssets ?? 0, tone: 'info' },
              { label: 'Out of service', value: assetsSummary.data?.totals.outOfServiceAssets ?? 0, tone: 'danger' },
              { label: 'Overdue maintenance', value: assetsSummary.data?.totals.overdueMaintenanceCount ?? 0, tone: 'danger' },
            ]}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Recent activity"
          title={demoContext.config.recentActivityTitle}
          description={demoContext.config.recentActivityDescription}
        >
          <SignalBarList
            items={recentActivity.map((item, index) => ({
              label: item.label,
              value: item.value,
              tone: index === 2 ? 'danger' : 'info',
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="Work order monitoring"
          title="Work execution breakdown"
          description="Operational work order status mix and zone distribution."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SignalBarList
              items={(operationsSummary.data?.workOrdersByStatus ?? []).map((entry) => ({
                label: entry.status.replaceAll('_', ' '),
                value: entry.count,
                tone: entry.status === 'BLOCKED' ? 'danger' : entry.status === 'ACTIVE' ? 'info' : 'default',
              }))}
              emptyMessage="No work order status data available."
            />
            <SignalBarList
              items={(operationsSummary.data?.assignmentsByZone ?? []).slice(0, 5).map((entry) => ({
                label: entry.zoneName ?? entry.zoneCode ?? 'Unassigned zone',
                value: entry.count,
                tone: 'info',
              }))}
              emptyMessage="No zone allocation data available."
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Incident monitoring"
          title="Severity mix and response pressure"
          description="Where workforce members should focus incident response effort right now."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SignalBarList
              items={(incidentTrends.data?.severityMix ?? []).map((entry) => ({
                label: entry.severity,
                value: entry.count,
                tone:
                  entry.severity === 'CRITICAL'
                    ? 'danger'
                    : entry.severity === 'HIGH'
                      ? 'danger'
                      : entry.severity === 'MEDIUM'
                        ? 'info'
                        : 'default',
              }))}
              emptyMessage="No incident severity data available."
            />
            <div className="space-y-3">
              <CompactFact label="Open incidents" value={openIncidents} />
              <CompactFact label="Critical + high incidents" value={sumSeverityMix(incidentTrends.data?.severityMix ?? [], ['CRITICAL', 'HIGH'])} />
              <CompactFact label="Incidents reported in window" value={sumTrend(incidentTrends.data?.incidentsReported ?? [])} />
              <CompactFact label="Overdue approval steps" value={approvalsSummary.data?.totals.overdueApprovalSteps ?? 0} />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="AI insights"
        title={demoContext.config.aiTitle}
        description={demoContext.config.aiDescription}
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {aiInsights.map((insight) => (
            <AiInsightCard
              key={insight.title}
              title={insight.title}
              severity={insight.severity}
              summary={insight.summary}
              recommendation={insight.recommendation}
              value={insight.value}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sublabel,
  suffix = '',
}: {
  label: string;
  value: number;
  sublabel: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">
        {formatNumber(value)}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{sublabel}</p>
    </div>
  );
}

function CompactFact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm font-semibold text-white">{formatNumber(value)}</span>
      </div>
    </div>
  );
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function sumTrend(points: Array<{ count: number }>) {
  return points.reduce((sum, point) => sum + point.count, 0);
}

function sumSeverityMix(
  points: Array<{ severity: string; count: number }>,
  severities: string[],
) {
  const severitySet = new Set(severities);
  return points.reduce((sum, point) => sum + (severitySet.has(point.severity) ? point.count : 0), 0);
}

function deriveOperationalInsights({
  activeShiftsToday,
  activeAssignments,
  openIncidents,
  overdueMaintenance,
  expiringComplianceArtifacts,
  availableWorkforce,
  nonCompliantOperators,
}: {
  activeShiftsToday: number;
  activeAssignments: number;
  openIncidents: number;
  overdueMaintenance: number;
  expiringComplianceArtifacts: number;
  availableWorkforce: number;
  nonCompliantOperators: number;
}) {
  const shiftGap = Math.max(activeShiftsToday - activeAssignments, 0);

  return [
    {
      title: 'Execution capacity pressure',
      severity: shiftGap > 8 ? 'CRITICAL' : (shiftGap > 3 ? 'HIGH' : 'MEDIUM'),
      summary: shiftGap > 0 
        ? `${formatNumber(shiftGap)} active shifts are currently uncovered by active assignments.`
        : 'Workforce assignments are currently meeting active shift demand.',
      recommendation: 'Monitor shift coverage and approve necessary staffing adjustments.',
      value: shiftGap,
    },
    {
      title: 'Incident escalation risk',
      severity: openIncidents > 6 ? 'CRITICAL' : (openIncidents > 3 ? 'HIGH' : 'MEDIUM'),
      summary: `${formatNumber(openIncidents)} incidents remain open and require operational response.`,
      recommendation: 'Prioritize unresolved high-severity incidents to reduce response pressure.',
      value: openIncidents,
    },
    {
      title: 'Asset maintenance risk',
      severity: overdueMaintenance > 5 ? 'HIGH' : (overdueMaintenance > 0 ? 'MEDIUM' : 'LOW'),
      summary: overdueMaintenance > 0 
        ? `${formatNumber(overdueMaintenance)} assets are overdue for maintenance in the current window.`
        : 'Asset maintenance backlog is currently within stable thresholds.',
      recommendation: 'Clear overdue maintenance to maintain operational asset readiness.',
      value: overdueMaintenance,
    },
    {
      title: 'Compliance and staffing signal',
      severity: (nonCompliantOperators > 4 || expiringComplianceArtifacts > 4) ? 'HIGH' : 'MEDIUM',
      summary: `${formatNumber(nonCompliantOperators)} non-compliant members and ${formatNumber(expiringComplianceArtifacts)} expiring artifacts detected.`,
      recommendation: 'Validate compliance records and clear blockers for available personnel.',
      value: nonCompliantOperators + expiringComplianceArtifacts,
    },
  ] as const;
}
