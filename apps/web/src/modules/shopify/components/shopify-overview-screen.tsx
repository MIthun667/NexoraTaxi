'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { useCrmSegments } from '@/hooks/queries/use-crm';
import {
  useCommerceDataTrust,
  useShopifyDailyBrief,
  useShopifyActionProposals,
  useShopifyRecommendations,
  useShopifySignals,
  useShopifySummary,
} from '@/hooks/queries/use-shopify-intelligence';
import { useShopifyConnectionStatus } from '@/hooks/queries/use-shopify';
import { useStripeFinanceSummary, useStripeStatus } from '@/hooks/queries/use-stripe';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { ApiClientError } from '@/lib/api-client';
import { permissionLabels } from '@/lib/navigation';

import { AiRecommendationList } from './ai-recommendation-list';
import { AiSignalList } from './ai-signal-list';
import { CustomerIntelligenceCard } from './customer-intelligence-card';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { OverviewDailyBriefPanel } from './overview-daily-brief-panel';
import { OverviewKeyMetrics } from './overview-key-metrics';
import { OverviewNeedsAttention } from './overview-needs-attention';
import { OverviewSystemStatusBar } from './overview-system-status-bar';
import { ShopifyConnectionStatusCard } from './shopify-connection-status-card';
import { StripeFinanceSummaryCard } from './stripe-finance-summary-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyOverviewScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageRecommendations = hasPermission(permissionLabels.intelligenceGenerate);

  const summaryQuery = useShopifySummary(organizationId);
  const dailyBriefQuery = useShopifyDailyBrief(organizationId);
  const signalsQuery = useShopifySignals(organizationId);
  const recommendationsQuery = useShopifyRecommendations(organizationId);
  const proposalsQuery = useShopifyActionProposals(organizationId);
  const trustQuery = useCommerceDataTrust(organizationId);
  const shopifyConnectionStatusQuery = useShopifyConnectionStatus(organizationId);
  const stripeStatusQuery = useStripeStatus(organizationId);
  const stripeFinanceSummaryQuery = useStripeFinanceSummary(organizationId);
  const crmSegmentsQuery = useCrmSegments(organizationId);

  const queries = [
    summaryQuery,
    signalsQuery,
    recommendationsQuery,
    proposalsQuery,
    trustQuery,
    shopifyConnectionStatusQuery,
    stripeStatusQuery,
    stripeFinanceSummaryQuery,
    crmSegmentsQuery,
  ];

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: queries.map((query) => query.error),
  });

  if (activeContext.isLoading || queries.some((query) => query.isLoading) || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Select an organization to continue"
          description="Overview is organization-scoped so that metrics, signals, and actions stay trustworthy and commercially meaningful."
          action={
            <Link href="/shopify/connected-stores">
              <Button variant="outline">
                Open stores
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (queries.some((query) => query.isError) || !summaryQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          summaryQuery.refetch();
          trustQuery.refetch();
          signalsQuery.refetch();
          recommendationsQuery.refetch();
          proposalsQuery.refetch();
          shopifyConnectionStatusQuery.refetch();
          stripeStatusQuery.refetch();
          stripeFinanceSummaryQuery.refetch();
          crmSegmentsQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;
  const signals = signalsQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? [];
  const proposals = proposalsQuery.data ?? [];
  const trust = trustQuery.data ?? null;
  const shopifyConnectionStatus = shopifyConnectionStatusQuery.data ?? null;
  const stripeStatus = stripeStatusQuery.data ?? null;
  const stripeFinanceSummary = stripeFinanceSummaryQuery.data ?? null;

  const hasCommerceData =
    summary.metrics.totalRevenue > 0 ||
    summary.metrics.totalOrders > 0 ||
    summary.metrics.newCustomers > 0 ||
    Boolean(summary.metrics.topProduct);
  const limitedShopifyAccess = Boolean(shopifyConnectionStatus?.limitedAccess);

  return (
    <div className="space-y-10 pb-12">
      {!hasCommerceData && !limitedShopifyAccess ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="Connect your store to start receiving insights"
          description="Run the first sync so Nexora can begin building signals, opportunities, and today's brief."
        />
      ) : (
        <>
          <OverviewSystemStatusBar
            trust={trust}
          />

          <div className="grid items-start gap-8 xl:grid-cols-[1.35fr_0.65fr]">
            <OverviewDailyBriefPanel
              brief={dailyBriefQuery.data ?? null}
              trust={trust}
              isLoading={dailyBriefQuery.isLoading}
              errorMessage={dailyBriefQuery.isError ? toProductMessage(dailyBriefQuery.error as ApiClientError) : null}
              canRefresh={canManageRecommendations}
              isRefreshing={dailyBriefQuery.isRefetching}
              onRefresh={() => {
                void dailyBriefQuery.refetch();
              }}
            />
            <div className="space-y-8">
              <OverviewNeedsAttention
                signals={signals}
                recommendations={recommendations}
                proposals={proposals}
              />
              <ShopifyConnectionStatusCard status={shopifyConnectionStatus} />
            </div>
          </div>

          <OverviewKeyMetrics
            totalRevenue={summary.metrics.totalRevenue}
            totalOrders={summary.metrics.totalOrders}
            newCustomers={summary.metrics.newCustomers}
            highSeveritySignals={summary.metrics.highSeveritySignalsCount}
          />

          <div className="grid items-start gap-8 xl:grid-cols-2">
            <AiSignalList signals={signals.slice(0, 6)} />
            <AiRecommendationList
              recommendations={recommendations.slice(0, 6)}
              canManage={false}
            />
          </div>

          <div className="grid items-start gap-8 xl:grid-cols-2">
            <StripeFinanceSummaryCard summary={stripeFinanceSummary} />
            <CustomerIntelligenceCard
              segments={crmSegmentsQuery.data ?? null}
              isLoading={crmSegmentsQuery.isLoading}
            />
          </div>

          {dailyBriefQuery.isError ? (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-100">
              {toProductMessage(
                dailyBriefQuery.error as ApiClientError,
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function toProductMessage(error: ApiClientError) {
  if (error.code === 'RESOURCE_NOT_FOUND') {
    return 'Nexora could not find the current daily brief. Refresh to regenerate the latest overview.';
  }

  return error.message || 'Nexora could not refresh the overview right now. Please try again.';
}
