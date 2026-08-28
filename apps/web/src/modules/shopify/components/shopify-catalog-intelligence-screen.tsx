'use client';

import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useShopifySignals, useShopifySummary } from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';

import { AiSignalList } from './ai-signal-list';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ShopifyKpiStrip } from './shopify-kpi-strip';
import { TopProductCard } from './top-product-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyCatalogIntelligenceScreen() {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const summaryQuery = useShopifySummary(organizationId);
  const signalsQuery = useShopifySignals(organizationId);
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [summaryQuery.error, signalsQuery.error],
  });

  if (activeContext.isLoading || summaryQuery.isLoading || signalsQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Catalog"
          title="Select an organization to review catalog performance"
          description="Catalog views are organization-scoped so product momentum, revenue concentration, and demand changes stay trustworthy."
        />
        <EmptyState
          title="Catalog insights need a single organization scope"
          description="Choose one organization to review top-performing products and product-related signals."
        />
      </div>
    );
  }

  if (summaryQuery.isError || signalsQuery.isError || !summaryQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          summaryQuery.refetch();
          signalsQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;
  const signals = signalsQuery.data ?? [];
  const hasCatalogData =
    Boolean(summary.metrics.topProduct) ||
    summary.metrics.totalOrders > 0 ||
    summary.metrics.totalRevenue > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Product demand and catalog health"
        description="Review which products are carrying demand and where the catalog may need closer attention."
        actions={
          <Link href="/shopify/store-performance">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Performance
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {!hasCatalogData ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="Catalog insights need synced order and product data"
          description="Connect Shopify and complete a successful sync before Nexora can interpret product demand clearly."
        />
      ) : (
        <>
          <ShopifyKpiStrip
            totalRevenue={summary.metrics.totalRevenue}
            totalOrders={summary.metrics.totalOrders}
            newCustomers={summary.metrics.newCustomers}
            highSeveritySignals={summary.metrics.highSeveritySignalsCount}
            refundTelemetryAvailable={Boolean(summary.metrics.refundTelemetryAvailable)}
          />
          {summary.metrics.topProduct ? <TopProductCard product={summary.metrics.topProduct} /> : null}
          <AiSignalList signals={signals.slice(0, 5)} />
        </>
      )}
    </div>
  );
}
