'use client';

import Link from 'next/link';
import { ArrowRight, CreditCard } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useStripeStatus, useConnectStripe, useRunStripeSync, useStripeFinanceSummary } from '@/hooks/queries/use-stripe';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { FinanceOverviewCard } from './finance-overview-card';
import { StripeConnectionCard } from './stripe-connection-card';
import { StripeFinanceSummaryCard } from './stripe-finance-summary-card';
import { StripeSyncCard } from './stripe-sync-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyFinanceIntelligenceScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageIntegrations = hasPermission(permissionLabels.organizationManage);

  const stripeStatusQuery = useStripeStatus(organizationId);
  const stripeFinanceSummaryQuery = useStripeFinanceSummary(organizationId);
  const connectStripeMutation = useConnectStripe();
  const stripeSyncMutation = useRunStripeSync();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [stripeStatusQuery.error, stripeFinanceSummaryQuery.error],
  });

  if (activeContext.isLoading || stripeStatusQuery.isLoading || stripeFinanceSummaryQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Payments"
          title="Select an organization to review payments"
          description="Payments are organization-scoped so payment health, refund pressure, and Stripe coverage remain clear."
        />
        <EmptyState
          title="Payments need a single organization scope"
          description="Choose one organization to review Stripe linkage, finance signals, and payment health."
        />
      </div>
    );
  }

  if (stripeStatusQuery.isError || stripeFinanceSummaryQuery.isError) {
    return (
      <DashboardErrorState
        onRetry={() => {
          stripeStatusQuery.refetch();
          stripeFinanceSummaryQuery.refetch();
        }}
      />
    );
  }

  const stripeStatus = stripeStatusQuery.data ?? null;
  const stripeFinanceSummary = stripeFinanceSummaryQuery.data ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Payment health and confirmed revenue"
        description="Track payment coverage, Stripe sync status, refund pressure, and revenue visibility without presenting Nexora as a full accounting system."
        actions={
          <Link href="/shopify/connected-stores">
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Stores
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <StripeConnectionCard
          status={stripeStatus}
          canManage={canManageIntegrations}
          isSubmitting={connectStripeMutation.isPending}
          errorMessage={null}
          onSubmit={(secretKey) => {
            if (!organizationId) {
              return;
            }

            connectStripeMutation.mutate({ organizationId, secretKey });
          }}
        />
        <StripeSyncCard
          latestSync={stripeStatus?.latestSyncRun ?? null}
          connected={Boolean(stripeStatus?.connected)}
          canManage={canManageIntegrations}
          isSubmitting={stripeSyncMutation.isPending}
          errorMessage={null}
          onRunSync={() => {
            if (!organizationId) {
              return;
            }

            stripeSyncMutation.mutate(organizationId);
          }}
        />
      </div>

      <StripeFinanceSummaryCard summary={stripeFinanceSummary} />

      <FinanceOverviewCard
        status={stripeStatus}
        summary={stripeFinanceSummary}
        canManage={canManageIntegrations}
        isConnecting={connectStripeMutation.isPending}
        isSyncing={stripeSyncMutation.isPending}
        errorMessage={null}
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
    </div>
  );
}
