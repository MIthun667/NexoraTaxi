'use client';

import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  useCreateStrategicPlan,
  useCreateStrategicPriority,
  useGenerateStrategicCandidates,
  useStrategicPlan,
  useUpdateStrategicPriority,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';
import { StrategicPriority, StrategicPriorityCandidate } from '@/types/shopify-intelligence';

import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { StrategicCandidatePriorities } from './strategic-candidate-priorities';
import { StrategicPlanSummary } from './strategic-plan-summary';
import { StrategicPriorityCard } from './strategic-priority-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function StrategicPlanningScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const canGenerate = hasPermission(permissionLabels.intelligenceGenerate);
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const workspaceQuery = useStrategicPlan(organizationId, 'current_cycle');
  const createPlanMutation = useCreateStrategicPlan();
  const createPriorityMutation = useCreateStrategicPriority();
  const updatePriorityMutation = useUpdateStrategicPriority();
  const generateCandidatesMutation = useGenerateStrategicCandidates();

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [workspaceQuery.error],
  });

  if (activeContext.isLoading || workspaceQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <EmptyState
        title="Select an organization to continue"
        description="Strategic planning is organization-scoped so priorities stay grounded in one business unit at a time."
      />
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return <DashboardErrorState onRetry={() => workspaceQuery.refetch()} />;
  }

  const workspace = workspaceQuery.data;

  if (!workspace.trust.integrations.shopify.connected) {
    return (
      <EmptyState
        title="Strategy becomes available once store data is connected"
        description="Connect your store to generate strategic priorities from current Nexora intelligence."
      />
    );
  }

  const handleAddCandidate = (candidate: StrategicPriorityCandidate) => {
    if (!organizationId || !workspace.plan) {
      return;
    }

    createPriorityMutation.mutate({
      organizationId,
      planId: workspace.plan.id,
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
      urgency: candidate.urgency,
      status: 'identified',
      successCriteria: candidate.successCriteria,
      linkedSignals: candidate.linkedSignals,
      linkedRecommendations: candidate.linkedRecommendations,
      linkedProposals: candidate.linkedProposals,
      linkedScenarios: candidate.linkedScenarios,
      linkedExecutions: candidate.linkedExecutions,
      linkedAgentRuns: candidate.linkedAgentRuns,
      linkedOutcomeSummary: candidate.linkedOutcomeSummary,
    });
  };

  const handleStatusChange = (priority: StrategicPriority, status: string) => {
    if (!organizationId || !workspace.plan) {
      return;
    }

    updatePriorityMutation.mutate({
      organizationId,
      planId: workspace.plan.id,
      priorityId: priority.id,
      status,
    });
  };

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={workspace.trust}
        title="Strategic Trust"
        description="Current trust and visibility context behind this planning workspace."
      />

      <StrategicPlanSummary
        plan={workspace.plan}
        limitations={workspace.limitations}
        onCreatePlan={() => {
          if (!organizationId) {
            return;
          }
          createPlanMutation.mutate({
            organizationId,
            planningWindow: 'current_cycle',
            status: 'active',
          });
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Candidate Priorities"
          description="Bounded priorities generated from current Nexora trust, signals, actions, scenarios, and outcomes."
          actions={
            workspace.plan ? (
              <Button
                variant="outline"
                size="sm"
                disabled={!canGenerate || generateCandidatesMutation.isPending}
                onClick={() => generateCandidatesMutation.mutate({ planId: workspace.plan!.id })}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {generateCandidatesMutation.isPending ? 'Refreshing...' : 'Refresh Candidates'}
              </Button>
            ) : undefined
          }
        >
          <StrategicCandidatePriorities
            items={workspace.candidatePriorities}
            disabled={!workspace.plan}
            isPending={createPriorityMutation.isPending}
            onAdd={handleAddCandidate}
          />
          {!workspace.plan ? (
            <p className="mt-4 text-sm text-slate-500">
              Create the current plan first, then add the candidate priorities you want to track.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Active Priorities"
          description="Structured priorities leadership can track across the current planning window."
        >
          {workspace.plan?.priorities.length ? (
            <div className="space-y-4">
              {workspace.plan.priorities.map((priority) => (
                <StrategicPriorityCard
                  key={priority.id}
                  priority={priority}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No strategic priorities are active yet"
              description="Add one or more candidate priorities to turn current Nexora intelligence into a tracked operating plan."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
