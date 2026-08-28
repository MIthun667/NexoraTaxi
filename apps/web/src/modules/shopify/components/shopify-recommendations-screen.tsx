'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Select } from '@/components/ui/select';
import {
  useCommerceDataTrust,
  useCreateShopifyActionProposal,
  useFilteredShopifyRecommendations,
  useRefreshShopifyRecommendations,
  useShopifyActionProposals,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { ActionProposalList } from './action-proposal-list';
import { AiRecommendationList } from './ai-recommendation-list';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyRecommendationsScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageRecommendations = hasPermission(permissionLabels.intelligenceGenerate);
  const [urgency, setUrgency] = useState<string>('all');
  const [affectedArea, setAffectedArea] = useState<string>('all');
  const [confidence, setConfidence] = useState<string>('all');
  const filters = useMemo(
    () => ({
      urgency: urgency === 'all' ? undefined : urgency,
      affectedArea: affectedArea === 'all' ? undefined : affectedArea,
      confidence: confidence === 'all' ? undefined : confidence,
    }),
    [affectedArea, confidence, urgency],
  );

  const recommendationsQuery = useFilteredShopifyRecommendations(organizationId, filters);
  const trustQuery = useCommerceDataTrust(organizationId);
  const proposalsQuery = useShopifyActionProposals(organizationId);
  const refreshRecommendationsMutation = useRefreshShopifyRecommendations();
  const createProposalMutation = useCreateShopifyActionProposal();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [recommendationsQuery.error, trustQuery.error, proposalsQuery.error],
  });

  if (activeContext.isLoading || recommendationsQuery.isLoading || trustQuery.isLoading || proposalsQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Opportunities need a single organization scope"
          description="Choose one organization to review current advisory guidance and convert it into bounded actions when needed."
        />
      </div>
    );
  }

  if (recommendationsQuery.isError || trustQuery.isError || proposalsQuery.isError) {
    return (
      <DashboardErrorState
        onRetry={() => {
          recommendationsQuery.refetch();
          trustQuery.refetch();
          proposalsQuery.refetch();
        }}
      />
    );
  }

  const recommendations = recommendationsQuery.data ?? [];
  const trust = trustQuery.data ?? null;
  const proposals = proposalsQuery.data ?? [];
  const staleRecommendations = recommendations.filter(
    (recommendation) => recommendation.confidence === 'low',
  ).length;

  return (
    <div className="space-y-6">
      {recommendations.length === 0 ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="No high-priority recommendations are active right now"
          description={
            staleRecommendations > 0
              ? 'Recommendations are limited until store data is current.'
              : 'Nexora has not surfaced a new advisory recommendation from the current intelligence window.'
          }
        />
      ) : null}

      <CommerceDataTrustPanel
        trust={trust}
        title="Data Status"
        description="Recommendations are advisory. Use current coverage and freshness to judge how strongly to lean on them."
      />

      <SectionCard
        title="Opportunity Review"
        description="Advisory guidance grounded in live signals, visibility, and commerce performance."
        actions={
          canManageRecommendations ? (
            <button
              type="button"
              onClick={() => {
                if (organizationId) {
                  refreshRecommendationsMutation.mutate(organizationId);
                }
              }}
              className="text-sm font-medium text-slate-300 transition hover:text-slate-100"
            >
              {refreshRecommendationsMutation.isPending ? 'Refreshing...' : 'Refresh opportunities'}
            </button>
          ) : null
        }
        variant="subtle"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option value="all">All urgency levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select value={affectedArea} onChange={(event) => setAffectedArea(event.target.value)}>
            <option value="all">All areas</option>
            <option value="revenue">Revenue</option>
            <option value="orders">Orders</option>
            <option value="customers">Customers</option>
            <option value="products">Products</option>
            <option value="integrations">Integrations</option>
            <option value="payments">Payments</option>
            <option value="data_quality">Data quality</option>
          </Select>
          <Select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
            <option value="all">All confidence levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
      </SectionCard>

      <AiRecommendationList
        recommendations={recommendations}
        canManage={canManageRecommendations}
        isGenerating={refreshRecommendationsMutation.isPending}
        isSubmitting={createProposalMutation.isPending}
        onGenerate={() => {
          if (!organizationId) {
            return;
          }

          refreshRecommendationsMutation.mutate(organizationId);
        }}
        onCreateProposal={(recommendationId) => {
          if (!organizationId) {
            return;
          }

          createProposalMutation.mutate({
            organizationId,
            recommendationId,
          });
        }}
        emptyMessage={
          staleRecommendations > 0
            ? 'Recommendations are limited until store data is current.'
            : 'No high-priority recommendations are active right now.'
        }
      />

      <ActionProposalList proposals={proposals.slice(0, 6)} />
    </div>
  );
}
