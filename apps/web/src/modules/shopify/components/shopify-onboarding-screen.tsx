'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { permissionLabels } from '@/lib/navigation';
import { ApiClientError } from '@/lib/api-client';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useConnectShopify, useRunInitialShopifySync, useShopifyConnectionStatus, useShopifySyncStatus } from '@/hooks/queries/use-shopify';
import { useShopifySummary } from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';

import { ConnectShopifyCard } from './connect-shopify-card';
import { FirstSyncCard } from './first-sync-card';
import { OnboardingProgressSteps } from './onboarding-progress-steps';
import { OnboardingSuccessState } from './onboarding-success-state';
import { ShopifyConnectionStatusCard } from './shopify-connection-status-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

type Mode = 'connect' | 'onboarding';

export function ShopifyOnboardingScreen({ mode = 'onboarding' }: { mode?: Mode }) {
  const activeContext = useDemoContext();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const organizationIdFromSearch = searchParams.get('organizationId');
  const organizationId = organizationIdFromSearch ?? activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const connectedFromOauth = searchParams.get('status') === 'connected';
  const shopDomainHint = searchParams.get('shopDomain') ?? '';

  useEffect(() => {
    if (
      organizationIdFromSearch &&
      activeContext.canSelectScope &&
      activeContext.selectedScope !== organizationIdFromSearch
    ) {
      activeContext.setSelectedScope(organizationIdFromSearch);
    }
  }, [
    activeContext,
    organizationIdFromSearch,
  ]);

  const connectionStatus = useShopifyConnectionStatus(organizationId);
  const syncStatus = useShopifySyncStatus(organizationId);
  const summaryQuery = useShopifySummary(organizationId);
  const connectMutation = useConnectShopify();
  const syncMutation = useRunInitialShopifySync();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [connectionStatus.error, syncStatus.error, summaryQuery.error],
  });

  const canManageShopify = hasPermission(permissionLabels.organizationManage);
  const latestSync =
    connectionStatus.data?.latestSyncRun ?? syncStatus.data?.[0] ?? null;
  const hasSuccessfulSync = latestSync?.status === 'SUCCEEDED';
  const hasPartialSync = latestSync?.status === 'PARTIAL_SUCCESS';
  const hasUsableSync = hasSuccessfulSync || hasPartialSync;
  const limitedAccess = Boolean(connectionStatus.data?.limitedAccess);
  const isIntelligenceReady =
    Boolean(connectionStatus.data?.connected) && hasUsableSync && Boolean(summaryQuery.data);

  const progressSteps = useMemo(() => {
    return [
      {
        key: 'connect',
        title: 'Connect Shopify store',
        description: connectionStatus.data?.connected
          ? 'Store connection is active.'
          : 'Authorize Nexora to read Shopify commerce data.',
        state: connectionStatus.data?.connected ? ('completed' as const) : ('current' as const),
      },
      {
        key: 'sync',
        title: 'Run first sync',
        description: hasSuccessfulSync
          ? 'Initial data import completed successfully.'
          : hasPartialSync
            ? 'Products synced successfully. Order and customer sync are waiting on Shopify protected customer data approval.'
          : syncMutation.isPending
            ? 'Orders, products, and customers are being imported now.'
            : 'Import orders, products, and customers to unlock intelligence.',
        state: hasSuccessfulSync
          ? ('completed' as const)
          : hasPartialSync
            ? ('completed' as const)
          : connectionStatus.data?.connected
            ? ('current' as const)
            : ('upcoming' as const),
      },
      {
        key: 'ready',
        title: 'Review insights',
        description: isIntelligenceReady
          ? 'Your store workspace is ready to explore.'
          : limitedAccess
            ? 'Nexora will show product connectivity and limited payment context while broader Shopify approval is still pending.'
            : 'Nexora will surface signals, insights, and daily summaries once syncing completes.',
        state: isIntelligenceReady
          ? ('completed' as const)
          : hasUsableSync
            ? ('current' as const)
            : ('upcoming' as const),
      },
    ];
  }, [
    connectionStatus.data?.connected,
    hasPartialSync,
    hasSuccessfulSync,
    isIntelligenceReady,
    limitedAccess,
    syncMutation.isPending,
  ]);

  const connectError = mapShopifyOnboardingError(connectMutation.error);
  const syncError = mapShopifyOnboardingError(syncMutation.error);

  const handleConnect = async (shopDomain: string) => {
    if (!organizationId) {
      return;
    }

    try {
      const response = await connectMutation.mutateAsync({
        organizationId,
        shopDomain,
      });
      window.location.assign(response.installUrl);
    } catch {
      // Mutation state already captures the API error for inline rendering.
    }
  };

  const handleFirstSync = async () => {
    if (!organizationId) {
      return;
    }

    await syncMutation.mutateAsync(organizationId);
    await Promise.all([
      connectionStatus.refetch(),
      syncStatus.refetch(),
      summaryQuery.refetch(),
    ]);
  };

  if (activeContext.isLoading || connectionStatus.isLoading || syncStatus.isLoading || isRecoveringScope) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Store Setup"
          title="Preparing your Shopify setup"
          description="Loading connection status, sync readiness, and the next best step."
        />
      </div>
    );
  }

  if (connectionStatus.isError || syncStatus.isError) {
    return (
      <DashboardOnboardingErrorState
        onRetry={() => {
          connectionStatus.refetch();
          syncStatus.refetch();
        }}
      />
    );
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Store Setup"
          title="Select an organization to continue"
          description="Store setup is organization-scoped. Choose an organization before connecting Shopify or running the first sync."
        />
        <EmptyState
          title="Multi-tenant organization scope is active"
          description="Pick a specific organization from the scope switcher above to connect a Shopify store and start onboarding."
          action={
            <Link href="/shopify">
              <Button variant="outline">
                Return to Overview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store Setup"
        title={mode === 'connect' ? 'Connect your Shopify store' : 'Go from connection to first intelligence'}
        description="Nexora guides you from store authorization through first sync and into live store insights."
      />


      {!canManageShopify ? (
        <EmptyState
          title="You can view intelligence, but not manage the store connection"
          description="An organization manager needs to connect Shopify and run the first sync before this organization can use Nexora Commerce."
          action={
            <Link href="/shopify">
              <Button variant="outline">
                Open Overview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <OnboardingProgressSteps steps={progressSteps} />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <ConnectShopifyCard
                defaultShopDomain={shopDomainHint}
                isSubmitting={connectMutation.isPending}
                errorMessage={connectError}
                onSubmit={handleConnect}
              />

              <FirstSyncCard
                latestSync={latestSync}
                isSubmitting={syncMutation.isPending}
                errorMessage={syncError}
                onRunSync={handleFirstSync}
              />
            </div>

            <div className="space-y-6">
              <ShopifyConnectionStatusCard
                status={connectionStatus.data ?? null}
                connectedFromOauth={connectedFromOauth}
              />

              {isIntelligenceReady && summaryQuery.data ? (
                <OnboardingSuccessState summary={summaryQuery.data} />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardOnboardingErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Unable to load Shopify onboarding"
      description="Nexora could not verify the current Shopify connection or sync status. Check backend availability and try again."
      onRetry={onRetry}
    />
  );
}

function mapShopifyOnboardingError(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return null;
  }

  switch (error.code) {
    case 'invalid_shop_domain':
      return 'Enter a valid Shopify store domain ending in myshopify.com.';
    case 'store_already_connected':
      return 'This organization already has an active Shopify store connected.';
    case 'duplicate_shop_connection':
      return 'That Shopify store is already linked to another organization.';
    case 'shopify_store_not_connected':
      return 'Connect a Shopify store before running the first sync.';
    case 'shopify_store_inactive':
      return 'The linked Shopify store is inactive. Reconnect it to continue.';
    case 'failed_to_fetch_shopify_orders':
    case 'failed_to_fetch_shopify_products':
    case 'failed_to_fetch_shopify_customers':
    case 'shopify_sync_failed':
      return 'The first sync could not complete. Try again in a moment or verify the store connection.';
    case 'protected_customer_data_required':
      return 'Products can sync now, but Shopify must approve protected customer data before Nexora can import orders and customers.';
    case 'API_UNREACHABLE':
      return 'Nexora could not reach the backend. Verify the API is running and try again.';
    default:
      return error.message || 'Something went wrong while processing Shopify onboarding.';
  }
}
