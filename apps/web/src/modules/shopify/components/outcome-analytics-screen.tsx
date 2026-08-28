'use client';

import Link from 'next/link';
import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  useOutcomeAnalytics,
  useRefreshOutcomeAnalytics,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ExecutionReliabilityPanel } from './execution-reliability-panel';
import { OutcomeSummaryPanel } from './outcome-summary-panel';
import { RecommendationEffectivenessPanel } from './recommendation-effectiveness-panel';
import { RoiHighlightsList } from './roi-highlights-list';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function OutcomeAnalyticsScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const canRefresh = hasPermission(permissionLabels.intelligenceGenerate);
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const outcomeAnalyticsQuery = useOutcomeAnalytics(organizationId, 30);
  const refreshOutcomeAnalyticsMutation = useRefreshOutcomeAnalytics();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [outcomeAnalyticsQuery.error],
  });

  if (activeContext.isLoading || outcomeAnalyticsQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <EmptyState
        title="Select an organization to continue"
        description="Outcome analytics are organization-scoped so action history and recorded results stay trustworthy."
        action={
          <Link href="/shopify/executive-brief">
            <Button variant="outline">Open daily brief</Button>
          </Link>
        }
      />
    );
  }

  if (outcomeAnalyticsQuery.isError || !outcomeAnalyticsQuery.data) {
    return <DashboardErrorState onRetry={() => outcomeAnalyticsQuery.refetch()} />;
  }

  const analytics = outcomeAnalyticsQuery.data;

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={analytics.trust}
        title="Outcome Trust"
        description="Use current source freshness and visibility to judge how strongly to interpret measured Nexora value."
      />

      <OutcomeSummaryPanel analytics={analytics} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <RoiHighlightsList items={analytics.roiHighlights} />
        <SectionCard
          title="Review Patterns"
          description="How operators are responding to Nexora proposals in the current lookback window."
          variant="subtle"
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={!canRefresh || refreshOutcomeAnalyticsMutation.isPending}
              onClick={() => {
                if (!organizationId) {
                  return;
                }
                refreshOutcomeAnalyticsMutation.mutate({ organizationId, lookbackDays: 30 });
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {refreshOutcomeAnalyticsMutation.isPending ? 'Refreshing...' : 'Refresh'}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <PatternStat label="Approval rate" value={formatPercent(analytics.proposalReviewPatterns.approvalRate)} />
              <PatternStat label="Rejection rate" value={formatPercent(analytics.proposalReviewPatterns.rejectionRate)} />
              <PatternStat label="Defer rate" value={formatPercent(analytics.proposalReviewPatterns.deferRate)} />
            </div>
            {analytics.proposalReviewPatterns.repeatedRejectionThemes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Repeated rejection themes</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {analytics.proposalReviewPatterns.repeatedRejectionThemes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No repeated rejection themes were recorded in the current lookback window.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecommendationEffectivenessPanel
          topEffective={analytics.recommendationEffectiveness.topEffective}
          weaker={analytics.recommendationEffectiveness.weaker}
        />
        <ExecutionReliabilityPanel analytics={analytics} />
      </div>

      <SectionCard
        title="Learning Trend"
        description="Whether recorded outcome quality is improving, stable, or weakening."
        variant="subtle"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{analytics.learningTrend.summary}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <PatternStat
              label="Recent positive outcome rate"
              value={analytics.learningTrend.recentPositiveOutcomeRate === null ? 'N/A' : formatPercent(analytics.learningTrend.recentPositiveOutcomeRate)}
            />
            <PatternStat
              label="Previous positive outcome rate"
              value={analytics.learningTrend.previousPositiveOutcomeRate === null ? 'N/A' : formatPercent(analytics.learningTrend.previousPositiveOutcomeRate)}
            />
          </div>
          {analytics.limitations.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-400">
              {analytics.limitations.map((item, index) => (
                <li key={`limitation-${index}-${item}`} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

function PatternStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
