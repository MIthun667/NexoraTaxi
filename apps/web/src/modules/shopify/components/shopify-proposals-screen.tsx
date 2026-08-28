'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/layout/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import {
  useCommerceDataTrust,
  useApproveShopifyProposal,
  useDeferShopifyProposal,
  useRejectShopifyProposal,
  useRefreshShopifyActionProposals,
  useShopifyActionProposals,
  useSubmitShopifyProposalForReview,
} from '@/hooks/queries/use-shopify-intelligence';
import { permissionLabels } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { ProposalReviewCard } from './proposal-review-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyProposalsScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canSubmit = hasPermission(permissionLabels.intelligenceGenerate);
  const canReview = hasPermission(permissionLabels.agentReview);
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');

  const proposalsQuery = useShopifyActionProposals(organizationId);
  const trustQuery = useCommerceDataTrust(organizationId);
  const submitForReview = useSubmitShopifyProposalForReview();
  const approveProposal = useApproveShopifyProposal();
  const rejectProposal = useRejectShopifyProposal();
  const deferProposal = useDeferShopifyProposal();
  const refreshProposals = useRefreshShopifyActionProposals();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [proposalsQuery.error, trustQuery.error],
  });

  if (activeContext.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Multi-tenant organization scope is active"
          description="Pick a specific organization from the scope switcher above to review proposal backlog and decision history."
        />
      </div>
    );
  }

  if (proposalsQuery.isLoading || trustQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (proposalsQuery.isError || trustQuery.isError) {
    return (
      <DashboardErrorState
        onRetry={() => {
          trustQuery.refetch();
          proposalsQuery.refetch();
        }}
      />
    );
  }

  const proposals = proposalsQuery.data ?? [];
  const trust = trustQuery.data ?? null;
  const filteredProposals = useMemo(
    () =>
      proposals.filter((proposal) => {
        if (statusFilter !== 'ALL' && proposal.status !== statusFilter) {
          return false;
        }
        if (riskFilter !== 'ALL' && proposal.riskLevel !== riskFilter) {
          return false;
        }
        if (typeFilter !== 'ALL' && (proposal.type ?? proposal.proposalType) !== typeFilter) {
          return false;
        }
        return true;
      }),
    [proposals, statusFilter, riskFilter, typeFilter],
  );
  const availableTypes = useMemo(
    () =>
      Array.from(
        new Set(
          proposals.map((proposal) => proposal.type ?? proposal.proposalType).filter(Boolean),
        ),
      ),
    [proposals],
  );

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={trust}
        title="Data Status"
        description="Actions stay reviewable and bounded. Current source trust helps explain how strongly to prioritize them."
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-300 outline-none"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_REVIEW">In review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DEFERRED">Deferred</option>
        </select>
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value)}
          className="h-9 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-300 outline-none"
        >
          <option value="ALL">All risks</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-9 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-300 outline-none"
        >
          <option value="ALL">All types</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!organizationId) {
              return;
            }
            refreshProposals.mutate(organizationId);
          }}
          disabled={!canSubmit || refreshProposals.isPending}
        >
          {refreshProposals.isPending ? 'Refreshing...' : 'Refresh actions'}
        </Button>
      </div>

      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <EmptyState
            title="No review actions are needed right now"
            description="Proposal generation is limited until store data is current, and no bounded review actions are currently active."
          />
        ) : (
          filteredProposals.map((proposal) => (
            <ProposalReviewCard
              key={proposal.id}
              proposal={proposal}
              canSubmit={canSubmit}
              canReview={canReview}
              isSubmitting={submitForReview.isPending}
              isReviewing={
                approveProposal.isPending ||
                rejectProposal.isPending ||
                deferProposal.isPending
              }
              onSubmitForReview={(note) => {
                if (!organizationId) {
                  return;
                }
                submitForReview.mutate({
                  organizationId,
                  actionProposalId: proposal.id,
                  note,
                });
              }}
              onApprove={(note) => {
                if (!organizationId) {
                  return;
                }
                approveProposal.mutate({
                  organizationId,
                  actionProposalId: proposal.id,
                  note,
                });
              }}
              onReject={(note) => {
                if (!organizationId) {
                  return;
                }
                rejectProposal.mutate({
                  organizationId,
                  actionProposalId: proposal.id,
                  note,
                });
              }}
              onDefer={(note) => {
                if (!organizationId) {
                  return;
                }
                deferProposal.mutate({
                  organizationId,
                  actionProposalId: proposal.id,
                  note,
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
