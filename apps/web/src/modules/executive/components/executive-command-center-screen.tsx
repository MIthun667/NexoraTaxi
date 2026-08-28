'use client';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useExecutiveOverview } from '@/hooks/queries/use-executive';
import { useObservabilitySummary, usePlatformHealth } from '@/hooks/queries/use-observability';
import { useAgentProposals, useAiOnboarding } from '@/hooks/queries/use-ai-command-center';
import { useAuth } from '@/hooks/use-auth';
import { buildExecutiveIntelligence } from '@/lib/command-intelligence';
import type { IntelligenceActionItem } from '@/lib/command-intelligence';
import { AgentExecutionPanel } from '@/modules/dashboard/components/agent-execution-panel';
import { IntelligenceSummaryBanner } from '@/modules/dashboard/components/intelligence-summary-banner';
import { RecommendedActionsList } from '@/modules/dashboard/components/recommended-actions-list';
import { RiskOpportunityStrip } from '@/modules/dashboard/components/risk-opportunity-strip';

import { AiRecommendationsPanel } from './ai-recommendations-panel';
import { CompanyHealthStrip } from './company-health-strip';
import { CrossFunctionalKpiGrid } from './cross-functional-kpi-grid';
import { ExecutiveSummaryCard } from './executive-summary-card';
import { ExecutiveTrendChart } from './executive-trend-chart';
import { LeadershipAssistantDrawer } from './leadership-assistant-drawer';
import { PriorityRisksPanel } from './priority-risks-panel';
import { SharedPlatformWidgetsGrid } from '@/modules/dashboard/components/shared-platform-widgets-grid';
import { OnboardingProgressCard } from '@/modules/ai/components/onboarding/onboarding-progress-card';

export function ExecutiveCommandCenterScreen() {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const agentScopeOrganizationId = activeContext.selectedOrganizationId ?? user?.organizationId ?? undefined;
  const overview = useExecutiveOverview(activeContext.selectedOrganizationId);
  const onboarding = useAiOnboarding(agentScopeOrganizationId);
  const isTenantScopedTelemetry =
    Boolean(activeContext.selectedOrganizationId) &&
    activeContext.selectedOrganizationId === user?.organizationId;
  const observabilitySummary = useObservabilitySummary(isTenantScopedTelemetry);
  const platformHealth = usePlatformHealth(isTenantScopedTelemetry);
  const agentProposals = useAgentProposals(
    agentScopeOrganizationId
      ? {
          page: 1,
          limit: 3,
          organizationId: agentScopeOrganizationId,
        }
      : undefined,
  );

  if (overview.isLoading) {
    return (
      <LoadingState
        title="Loading Executive Command Center..."
        description="Preparing leadership summaries, cross-functional KPIs, AI recommendations, and priority risk signals."
      />
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <ErrorState
        title="Unable to load the Executive Command Center."
        description="The leadership aggregation view could not be assembled from the current backend signals."
        onRetry={() => overview.refetch()}
      />
    );
  }

  const intelligence = buildExecutiveIntelligence({
    overview: overview.data,
    observabilitySummary: observabilitySummary.data,
    platformHealth: platformHealth.data,
    isTenantScopedTelemetry,
  });
  const liveAgentActions: IntelligenceActionItem[] =
    agentScopeOrganizationId && agentProposals.data
      ? agentProposals.data.items.slice(0, 3).map((proposal) => ({
          id: `proposal-${proposal.id}`,
          label: proposal.summary,
          reason: `${proposal.agentName} produced a reviewable ${proposal.actionType.toLowerCase().replaceAll('_', ' ')} proposal for the current tenant scope.`,
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
            !activeContext.selectedOrganizationId && user?.organizationId
              ? 'Review scope is limited to the current authenticated tenant while the executive view remains portfolio-style.'
              : undefined,
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeContext.config.eyebrow}
        title={activeContext.selectedOrganization?.name ?? overview.data.organizationName}
        description={`Executive Overview · ${overview.data.dataVolumeNote}`}
      />

      {onboarding.data && !onboarding.data.onboardingCompleted && (
        <OnboardingProgressCard status={onboarding.data} />
      )}

      <CompanyHealthStrip items={overview.data.statusCards} />

      <IntelligenceSummaryBanner data={intelligence.banner} />

      <RiskOpportunityStrip items={intelligence.strip} />

      <AgentExecutionPanel
        title="AI agents"
        description="Run bounded agents for the current executive scope and route only reviewed proposals."
      />

      {liveAgentActions.length > 0 ? (
        <RecommendedActionsList
          title="Pending AI-reviewed actions"
          description="Human-reviewed actions only."
          items={liveAgentActions}
        />
      ) : null}

      <SharedPlatformWidgetsGrid variant="executive" />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ExecutiveSummaryCard summary={overview.data.summary} />
        <LeadershipAssistantDrawer prompts={overview.data.assistantPrompts} memos={overview.data.memos} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PriorityRisksPanel risks={overview.data.risks} />
        <AiRecommendationsPanel recommendations={overview.data.recommendations} />
      </div>

      <CrossFunctionalKpiGrid items={overview.data.kpis} />

      <div className="grid gap-4 xl:grid-cols-2">
        {overview.data.trends.map((series) => (
          <ExecutiveTrendChart key={series.key} series={series} />
        ))}
      </div>
    </div>
  );
}
