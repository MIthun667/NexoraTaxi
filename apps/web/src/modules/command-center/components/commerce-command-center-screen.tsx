'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { ExecutiveBrief } from '@/components/intelligence/executive-brief';
import { SignalsPanel, type ConsolidatedSignal } from '@/components/intelligence/signals-panel';
import { DataCoverageCard } from '@/components/system/data-coverage-card';
import { LockedCapabilities } from '@/components/system/locked-capabilities';
import { ShopifyStatus } from '@/components/system/shopify-status';
import { SystemModeBanner, type SystemMode } from '@/components/system/system-mode-banner';
import { Button } from '@/components/ui/button';
import { useShopifySummary } from '@/hooks/queries/use-shopify-intelligence';
import { useShopifyConnectionStatus } from '@/hooks/queries/use-shopify';
import { useStripeStatus } from '@/hooks/queries/use-stripe';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';

export function CommerceCommandCenterScreen() {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const shopifyStatusQuery = useShopifyConnectionStatus(organizationId);
  const stripeStatusQuery = useStripeStatus(organizationId);
  const summaryQuery = useShopifySummary(organizationId);

  if (activeContext.isLoading || shopifyStatusQuery.isLoading || stripeStatusQuery.isLoading) {
    return (
      <LoadingState
        title="Loading AI Commerce Intelligence Surface..."
        description="Assembling system mode, data coverage, and commerce integration posture."
      />
    );
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="AI commerce intelligence"
          title="Select a tenant to open the command surface"
          description="Commerce intelligence stays tenant-scoped so Nexora can explain capability limits and operating mode clearly for one business at a time."
        />
        <EmptyState
          title="Awaiting data connection"
          description="Choose a tenant before opening the commerce intelligence surface."
        />
      </div>
    );
  }

  if (shopifyStatusQuery.isError || stripeStatusQuery.isError || summaryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load AI Commerce Intelligence Surface."
        description="One or more commerce intelligence services did not return successfully."
        onRetry={() => {
          shopifyStatusQuery.refetch();
          stripeStatusQuery.refetch();
          summaryQuery.refetch();
        }}
      />
    );
  }

  const shopifyStatus = shopifyStatusQuery.data ?? null;
  const stripeStatus = stripeStatusQuery.data ?? null;
  const summary = summaryQuery.data ?? null;

  const systemMode: SystemMode = !shopifyStatus?.connected
    ? 'empty'
    : shopifyStatus.limitedAccess
      ? 'partial'
      : 'full';

  const productsCoverage = shopifyStatus?.connected ? 100 : 0;
  const ordersCoverage =
    systemMode === 'partial' ? 20 : shopifyStatus?.capabilities.ordersAvailable ? 100 : 0;
  const customersCoverage =
    systemMode === 'partial' ? 20 : shopifyStatus?.capabilities.customersAvailable ? 100 : 0;
  const paymentsCoverage = stripeStatus?.connected ? 100 : 0;
  const accessGuideHref = organizationId ? `/shopify/onboarding?organizationId=${organizationId}` : '/shopify/onboarding';
  const continueHref = organizationId ? `/shopify?organizationId=${organizationId}` : '/shopify';

  const consolidatedSignals = buildSignals({
    systemMode,
    stripeConnected: Boolean(stripeStatus?.connected),
  });

  const hasAnyData =
    Boolean(shopifyStatus?.connected) ||
    Boolean(stripeStatus?.connected) ||
    Boolean(summary);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI commerce intelligence"
        title="AI Commerce Intelligence Surface"
        description="A production-grade operating surface for capability awareness, data coverage, and commerce intelligence confidence."
        actions={
          <Link href={continueHref as Route}>
            <Button variant="outline">
              Open commerce workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      />


      {!hasAnyData ? (
        <EmptyState
          title="Awaiting data connection"
          description="Connect Shopify or Stripe to activate the commerce intelligence surface."
          action={
            <Link href={accessGuideHref as Route}>
              <Button>Connect data sources</Button>
            </Link>
          }
        />
      ) : (
        <>
          <SystemModeBanner
            systemMode={systemMode}
            accessGuideHref={accessGuideHref}
            continueHref={continueHref}
          />

          <ExecutiveBrief
            systemMode={systemMode}
            revenueToday={summary?.metrics.totalRevenue ?? 0}
            ordersToday={summary?.metrics.totalOrders ?? 0}
          />

          <DataCoverageCard
            productsCoverage={productsCoverage}
            ordersCoverage={ordersCoverage}
            customersCoverage={customersCoverage}
            paymentsCoverage={paymentsCoverage}
          />

          <ShopifyStatus status={shopifyStatus} requestAccessHref={accessGuideHref} />

          <SignalsPanel signals={consolidatedSignals} />

          <LockedCapabilities isLocked={systemMode === 'partial'} />
        </>
      )}
    </div>
  );
}

function buildSignals({
  systemMode,
  stripeConnected,
}: {
  systemMode: SystemMode;
  stripeConnected: boolean;
}): ConsolidatedSignal[] {
  const signals: ConsolidatedSignal[] = [];

  if (systemMode === 'partial') {
    signals.push({
      severity: 'medium',
      title: 'Shopify data restriction',
      description: 'Orders and customers are blocked, so Nexora is operating in limited intelligence mode.',
    });
  }

  if (!stripeConnected) {
    signals.push({
      severity: systemMode === 'partial' ? 'medium' : 'low',
      title: 'Refund visibility gap',
      description: 'Stripe is not connected, so payment validation and refund monitoring remain incomplete.',
    });
  }

  if (systemMode === 'full' && stripeConnected) {
    signals.push({
      severity: 'low',
      title: 'Coverage healthy',
      description: 'Commerce demand, customer activity, and payment validation are all available.',
    });
  }

  return signals;
}
