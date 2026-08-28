'use client';

import Link from 'next/link';
import { ArrowRight, Store } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { useCrmSegments } from '@/hooks/queries/use-crm';
import { useDemoContext } from '@/hooks/use-demo-context';
import {
  useCreateShopifyActionProposal,
  useGenerateShopifyExecutiveSummary,
  useGenerateShopifyRecommendations,
  useShopifyActionProposals,
  useShopifyExecutiveSummary,
  useShopifyInsights,
  useShopifyRecommendations,
  useShopifySignals,
  useShopifySummary,
} from '@/hooks/queries/use-shopify-intelligence';
import {
  useConnectStripe,
  useRunStripeSync,
  useStripeFinanceSummary,
  useStripeStatus,
} from '@/hooks/queries/use-stripe';
import { useAuth } from '@/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { permissionLabels } from '@/lib/navigation';
import { useShopifyConnectionStatus } from '@/hooks/queries/use-shopify';

import { ActionProposalList } from './action-proposal-list';
import { AiRecommendationList } from './ai-recommendation-list';
import { AiInsightList } from './ai-insight-list';
import { AiSignalList } from './ai-signal-list';
import { CustomerIntelligenceCard } from './customer-intelligence-card';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ExecutiveSummaryCard } from './executive-summary-card';
import { FinanceOverviewCard } from './finance-overview-card';
import { LimitedModeBanner } from './limited-mode-banner';
import { ShopifyKpiStrip } from './shopify-kpi-strip';
import { TopProductCard } from './top-product-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyIntelligenceScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageRecommendations = hasPermission(permissionLabels.intelligenceGenerate);
  const canManageIntegrations = hasPermission(permissionLabels.organizationManage);

  const summaryQuery = useShopifySummary(organizationId);
  const executiveSummaryQuery = useShopifyExecutiveSummary(organizationId);
  const signalsQuery = useShopifySignals(organizationId);
  const insightsQuery = useShopifyInsights(organizationId);
  const recommendationsQuery = useShopifyRecommendations(organizationId);
  const proposalsQuery = useShopifyActionProposals(organizationId);
  const shopifyConnectionStatusQuery = useShopifyConnectionStatus(organizationId);
  const stripeStatusQuery = useStripeStatus(organizationId);
  const stripeFinanceSummaryQuery = useStripeFinanceSummary(organizationId);
  const crmSegmentsQuery = useCrmSegments(organizationId);
  const connectStripeMutation = useConnectStripe();
  const stripeSyncMutation = useRunStripeSync();
  const generateExecutiveSummaryMutation = useGenerateShopifyExecutiveSummary();
  const generateRecommendationsMutation = useGenerateShopifyRecommendations();
  const createProposalMutation = useCreateShopifyActionProposal();

  if (activeContext.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Performance needs a single organization scope"
          description="Pick one organization so Nexora can present a grounded performance view for its active store."
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

  const queries = [
    summaryQuery,
    signalsQuery,
    insightsQuery,
    recommendationsQuery,
    proposalsQuery,
    shopifyConnectionStatusQuery,
    stripeStatusQuery,
    stripeFinanceSummaryQuery,
  ];

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: queries.map((query) => query.error),
  });

  if (queries.some((query) => query.isLoading) || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (queries.some((query) => query.isError) || !summaryQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          summaryQuery.refetch();
          signalsQuery.refetch();
          insightsQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;
  const executiveSummary = executiveSummaryQuery.data ?? null;
  const signals = signalsQuery.data ?? [];
  const insights = insightsQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? [];
  const proposals = proposalsQuery.data ?? [];
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
    <div className="space-y-6">
      {!hasCommerceData && !limitedShopifyAccess ? (
        <DashboardEmptyState organizationId={organizationId} />
      ) : (
        <>
          <LimitedModeBanner
            limitedAccess={limitedShopifyAccess}
            stripeConnected={Boolean(stripeStatus?.connected)}
          />

          <ExecutiveSummaryCard
            executiveSummary={executiveSummary}
            limitedAccess={limitedShopifyAccess}
            revenue={summary.metrics.totalRevenue}
            orders={summary.metrics.totalOrders}
            customers={summary.metrics.newCustomers}
            isLoading={executiveSummaryQuery.isLoading}
            canRefresh={canManageRecommendations}
            isRefreshing={generateExecutiveSummaryMutation.isPending}
            onRefresh={() => {
              if (!organizationId) {
                return;
              }

              generateExecutiveSummaryMutation.mutate(organizationId);
            }}
          />

          <ShopifyKpiStrip
            totalRevenue={summary.metrics.totalRevenue}
            totalOrders={summary.metrics.totalOrders}
            newCustomers={summary.metrics.newCustomers}
            highSeveritySignals={summary.metrics.highSeveritySignalsCount}
            refundTelemetryAvailable={Boolean(summary.metrics.refundTelemetryAvailable)}
          />

          <AiSignalList signals={signals} />

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <FinanceOverviewCard
              status={stripeStatus}
              summary={stripeFinanceSummary}
              canManage={canManageIntegrations}
              isConnecting={connectStripeMutation.isPending}
              isSyncing={stripeSyncMutation.isPending}
              errorMessage={mapStripeError(connectStripeMutation.error) ?? mapStripeError(stripeSyncMutation.error)}
              onSubmit={(secretKey) => {
                if (!organizationId) {
                  return;
                }
                connectStripeMutation.mutate({ organizationId, secretKey });
              }}
              onRunSync={() => {
                if (!organizationId) {
                  return;
                }
                stripeSyncMutation.mutate(organizationId);
              }}
            />
            <CustomerIntelligenceCard
              segments={crmSegmentsQuery.data ?? null}
              isLoading={crmSegmentsQuery.isLoading}
            />
          </div>

          <AiInsightList
            insights={insights}
            highSeveritySignals={summary.metrics.highSeveritySignalsCount}
          />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <AiRecommendationList
              recommendations={recommendations}
              canManage={canManageRecommendations}
              isGenerating={generateRecommendationsMutation.isPending}
              isSubmitting={createProposalMutation.isPending}
              onGenerate={() => {
                if (!organizationId) {
                  return;
                }

                generateRecommendationsMutation.mutate(organizationId);
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
            />
            <ActionProposalList proposals={proposals} />
          </div>

          {summary.metrics.topProduct ? (
            <TopProductCard product={summary.metrics.topProduct} />
          ) : null}

          {(connectStripeMutation.error ||
            stripeSyncMutation.error ||
            generateExecutiveSummaryMutation.error ||
            generateRecommendationsMutation.error ||
            createProposalMutation.error) ? (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-100">
              {toProductMessage(
                (connectStripeMutation.error ??
                  stripeSyncMutation.error ??
                  generateExecutiveSummaryMutation.error ??
                  generateRecommendationsMutation.error ??
                  createProposalMutation.error) as ApiClientError,
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function toProductMessage(error: ApiClientError) {
  switch (error.code) {
    case 'invalid_stripe_secret_key':
      return 'Enter a valid Stripe secret key before connecting Stripe.';
    case 'duplicate_stripe_connection':
      return 'That Stripe account is already linked to another organization.';
    case 'stripe_sync_failed':
    case 'failed_to_fetch_stripe_charges':
    case 'failed_to_fetch_stripe_payment_events':
      return 'The Stripe sync could not complete. Verify the Stripe connection and try again.';
    case 'action_proposal_already_exists':
      return 'This opportunity already has an open action.';
    case 'recommendation_not_found':
      return 'The selected opportunity is no longer active. Refresh opportunities and try again.';
    case 'RESOURCE_NOT_FOUND':
      return 'Nexora could not find the requested daily brief. Refresh the page to regenerate today’s summary.';
    default:
      return error.message || 'Nexora could not update opportunities right now. Please try again.';
  }
}

function mapStripeError(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return null;
  }

  return toProductMessage(error);
}
