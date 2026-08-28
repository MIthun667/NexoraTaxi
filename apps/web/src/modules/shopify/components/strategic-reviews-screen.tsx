'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  useGenerateStrategicReview,
  useStrategicPlan,
  useStrategicReviews,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { PriorityProgressList } from './priority-progress-list';
import { StrategicReviewActionPanel } from './strategic-review-action-panel';
import { StrategicReviewOutcomePanel } from './strategic-review-outcome-panel';
import { StrategicReviewSummary } from './strategic-review-summary';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function StrategicReviewsScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const canGenerate = hasPermission(permissionLabels.intelligenceGenerate);
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const planQuery = useStrategicPlan(organizationId, 'current_cycle');
  const reviewsQuery = useStrategicReviews(organizationId, 'current_week', 6);
  const generateReviewMutation = useGenerateStrategicReview();

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [planQuery.error, reviewsQuery.error],
  });

  if (activeContext.isLoading || planQuery.isLoading || reviewsQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <EmptyState
        title="Select an organization to continue"
        description="Strategic reviews are organization-scoped so weekly business review stays grounded in one business unit at a time."
      />
    );
  }

  if (planQuery.isError || reviewsQuery.isError || !planQuery.data || !reviewsQuery.data) {
    return <DashboardErrorState onRetry={() => {
      planQuery.refetch();
      reviewsQuery.refetch();
    }} />;
  }

  const workspace = planQuery.data;
  const reviews = reviewsQuery.data;
  const latestReview = reviews[0] ?? null;

  if (!workspace.trust.integrations.shopify.connected) {
    return (
      <EmptyState
        title="Strategic reviews become available once store data is connected"
        description="Connect your store to generate a recurring weekly business review."
      />
    );
  }

  if (!workspace.plan) {
    return (
      <EmptyState
        title="Strategic reviews become available once an active plan is in place"
        description="Create your active strategic plan first so Nexora can review progress against real operating priorities."
      />
    );
  }

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={workspace.trust}
        title="Review Trust"
        description="Current trust and visibility context behind this review cycle."
      />

      {latestReview ? <StrategicReviewSummary review={latestReview} /> : (
        <SectionCard
          title="Strategic review"
          description="No persisted review has been generated for the current cycle yet."
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={!organizationId || !canGenerate || generateReviewMutation.isPending}
              onClick={() => {
                if (!organizationId) {
                  return;
                }
                generateReviewMutation.mutate({ organizationId, reviewWindow: 'current_week' });
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {generateReviewMutation.isPending ? 'Generating...' : 'Generate Review'}
            </Button>
          }
        >
          <p className="text-sm text-slate-400">
            There is not enough recent activity to generate a strong strategic review yet, or a review has not been generated for this window.
          </p>
        </SectionCard>
      )}

      {latestReview ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard
              title="Priority Progress"
              description="How current strategic priorities progressed or stalled during this review window."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!organizationId || !canGenerate || generateReviewMutation.isPending}
                  onClick={() => {
                    if (!organizationId) {
                      return;
                    }
                    generateReviewMutation.mutate({ organizationId, reviewWindow: 'current_week' });
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {generateReviewMutation.isPending ? 'Refreshing...' : 'Refresh Review'}
                </Button>
              }
            >
              <PriorityProgressList items={latestReview.priorityProgress} />
            </SectionCard>

            <SectionCard
              title="Executive Focus"
              description="What leadership should review before the next operating cycle."
            >
              <div className="space-y-3">
                {latestReview.executiveFocus.map((item) => (
                  <p key={item} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 text-sm text-slate-200">
                    {item}
                  </p>
                ))}
                {latestReview.limitations.length ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {latestReview.limitations[0]}
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Action Review"
              description="Proposal throughput, execution progress, and open governance risk."
            >
              <StrategicReviewActionPanel review={latestReview.actionReview} />
            </SectionCard>

            <SectionCard
              title="Outcome Review"
              description="How recent recorded outcomes affected confidence in current actions."
            >
              <StrategicReviewOutcomePanel review={latestReview.outcomeReview} />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard
              title="Signal Changes"
              description="The most important new, escalated, or resolved signals in this review window."
            >
              <div className="space-y-3">
                {latestReview.signalChanges.length ? latestReview.signalChanges.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {formatLabel(item.changeType)} · {formatLabel(item.severity)}
                        </p>
                      </div>
                      <Link href={item.href as Route} className="text-xs text-cyan-300 transition hover:text-cyan-200">
                        Open
                      </Link>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{item.summary}</p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400">No major signal changes were recorded in this window.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Scenario Notes"
              description="Relevant scenario context leadership should keep in view for the next cycle."
            >
              <div className="space-y-3">
                {latestReview.scenarioNotes.length ? latestReview.scenarioNotes.map((item) => (
                  <p key={item} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 text-sm text-slate-200">
                    {item}
                  </p>
                )) : (
                  <p className="text-sm text-slate-400">No linked scenario notes were required for this review.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={'/shopify/strategy' as Route} className="text-xs text-cyan-300 transition hover:text-cyan-200">
                    Open strategy
                  </Link>
                  <Link href={'/shopify/scenarios' as Route} className="text-xs text-cyan-300 transition hover:text-cyan-200">
                    Open scenarios
                  </Link>
                  <Link href={'/shopify/outcomes' as Route} className="text-xs text-cyan-300 transition hover:text-cyan-200">
                    Open outcomes
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Recent Reviews"
            description="Previous generated review snapshots retained for continuity and auditability."
          >
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{formatWindow(review.reviewWindow)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        Generated {formatDateTime(review.generatedAt)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {review.priorityProgress.length} priorit{review.priorityProgress.length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{review.summary}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function formatWindow(value: string) {
  return formatLabel(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
