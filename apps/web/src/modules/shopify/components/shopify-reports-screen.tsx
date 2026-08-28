'use client';

import Link from 'next/link';
import { ArrowRight, FileText, RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import {
  useCommerceDataTrust,
  useGenerateShopifyWeeklyDigest,
  useShopifyWeeklyDigest,
  useShopifyWeeklyDigestHistory,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { ProposalReviewSummaryCard } from './proposal-review-summary-card';
import { WeeklyDigestHero } from './weekly-digest-hero';
import { WeeklyHighlightsCard } from './weekly-highlights-card';
import { WeeklyMetricsStrip } from './weekly-metrics-strip';
import { WeeklyReportHistoryList } from './weekly-report-history-list';
import { WeeklyRisksCard } from './weekly-risks-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyReportsScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canGenerate = hasPermission(permissionLabels.intelligenceGenerate);

  const weeklyDigestQuery = useShopifyWeeklyDigest(organizationId);
  const weeklyHistoryQuery = useShopifyWeeklyDigestHistory(organizationId, 6);
  const trustQuery = useCommerceDataTrust(organizationId);
  const generateWeeklyDigestMutation = useGenerateShopifyWeeklyDigest();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [weeklyDigestQuery.error, weeklyHistoryQuery.error, trustQuery.error],
  });

  if (activeContext.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Multi-tenant organization scope is active"
          description="Pick a specific organization from the scope switcher above to review its current brief and recent digest history."
          action={
            <Link href="/shopify/overview">
              <Button variant="outline">
                Open overview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (weeklyDigestQuery.isLoading || weeklyHistoryQuery.isLoading || trustQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (weeklyDigestQuery.isError || weeklyHistoryQuery.isError || trustQuery.isError || !weeklyDigestQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          weeklyDigestQuery.refetch();
          weeklyHistoryQuery.refetch();
          trustQuery.refetch();
        }}
      />
    );
  }

  const digest = weeklyDigestQuery.data;
  const history = weeklyHistoryQuery.data ?? [];
  const trust = trustQuery.data ?? null;
  const hasMeaningfulData =
    digest.metrics.commerce.revenueCurrent > 0 ||
    digest.metrics.commerce.ordersCurrent > 0 ||
    digest.metrics.customer.totalProfiles > 0 ||
    digest.metrics.governance.proposalsCreated > 0;

  return (
    <div className="space-y-6">
      {!hasMeaningfulData ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="The daily brief needs live commerce data"
          description="Connect Shopify and Stripe, run syncs, and let Nexora accumulate signals, customer insight, and action history before the daily brief becomes meaningful."
        />
      ) : (
        <>
          <CommerceDataTrustPanel
            trust={trust}
            title="Data Status"
            description="Use current source freshness and visibility to judge how strongly to lean on the brief and trend comparisons below."
          />

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <WeeklyDigestHero
              digest={digest}
              actions={
                <div className="flex items-center gap-3">
                  <Link href="/shopify/overview">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Overview
                    </Button>
                  </Link>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!canGenerate || generateWeeklyDigestMutation.isPending}
                    onClick={() => {
                      if (!organizationId) {
                        return;
                      }
                      generateWeeklyDigestMutation.mutate(organizationId);
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {generateWeeklyDigestMutation.isPending ? 'Refreshing summary...' : 'Refresh Summary'}
                  </Button>
                </div>
              }
            />
            <ProposalReviewSummaryCard digest={digest} />
          </div>

          <WeeklyMetricsStrip digest={digest} />

          <div className="grid gap-6 xl:grid-cols-2">
            <WeeklyHighlightsCard items={digest.highlights} />
            <WeeklyRisksCard items={digest.risks} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <WeeklyReportHistoryList digests={history} />
          </div>
        </>
      )}
    </div>
  );
}
