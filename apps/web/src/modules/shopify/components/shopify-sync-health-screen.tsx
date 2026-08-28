'use client';

import Link from 'next/link';
import { ArrowRight, RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useShopifySyncStatus } from '@/hooks/queries/use-shopify';
import { useStripeStatus, useRunStripeSync } from '@/hooks/queries/use-stripe';
import {
  useCommerceDataTrust,
  useConnectedStores,
  useRetryConnectedStoreShopifySync,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { permissionLabels } from '@/lib/navigation';

import { ConnectedStoreCompactList } from './connected-store-status-card';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { LimitedModeBanner } from './limited-mode-banner';
import { StripeSyncCard } from './stripe-sync-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifySyncHealthScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageIntegrations = hasPermission(permissionLabels.organizationManage);

  const connectedStoresQuery = useConnectedStores(organizationId);
  const syncStatusQuery = useShopifySyncStatus(organizationId);
  const stripeStatusQuery = useStripeStatus(organizationId);
  const trustQuery = useCommerceDataTrust(organizationId);
  const retryShopifySyncMutation = useRetryConnectedStoreShopifySync();
  const runStripeSyncMutation = useRunStripeSync();

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [connectedStoresQuery.error, syncStatusQuery.error, stripeStatusQuery.error, trustQuery.error],
  });

  if (activeContext.isLoading || connectedStoresQuery.isLoading || syncStatusQuery.isLoading || stripeStatusQuery.isLoading || trustQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Data status needs a single organization scope"
          description="Choose one organization to review Shopify and Stripe freshness, sync coverage, and degraded states."
        />
      </div>
    );
  }

  if (connectedStoresQuery.isError || syncStatusQuery.isError || stripeStatusQuery.isError || trustQuery.isError) {
    return (
      <DashboardErrorState
        onRetry={() => {
          connectedStoresQuery.refetch();
          syncStatusQuery.refetch();
          stripeStatusQuery.refetch();
          trustQuery.refetch();
        }}
      />
    );
  }

  const connectedStores = connectedStoresQuery.data ?? [];
  const shopifyRuns = syncStatusQuery.data ?? [];
  const stripeStatus = stripeStatusQuery.data ?? null;
  const trust = trustQuery.data ?? null;
  const primaryStore = connectedStores.find((store) => store.storeId !== 'not-connected') ?? connectedStores[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/shopify/connected-stores">
          <Button variant="outline">
            Stores
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <CommerceDataTrustPanel
        trust={trust}
        title="Data Status"
        description="Current freshness, coverage, and source health for the intelligence shown across Nexora Commerce."
      />

      <LimitedModeBanner
        limitedAccess={Boolean(trust?.integrations.shopify.connected && trust?.coverageStatus !== 'full')}
        stripeConnected={Boolean(stripeStatus?.connected)}
      />

      <SectionCard
        title="Connected store status"
        description="Current integration state, limitations, and next steps across your connected commerce systems."
        variant="subtle"
      >
        {connectedStores.length === 0 ? (
          <p className="text-sm text-slate-400">Connect your store to start receiving insights.</p>
        ) : (
          <ConnectedStoreCompactList stores={connectedStores} />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          eyebrow="Shopify Data"
          title="Shopify freshness and coverage"
          actions={
            <Button
              size="sm"
              variant="outline"
              disabled={!canManageIntegrations || retryShopifySyncMutation.isPending || !primaryStore || primaryStore.storeId === 'not-connected'}
              onClick={() => {
                if (!organizationId || !primaryStore || primaryStore.storeId === 'not-connected') {
                  return;
                }

                retryShopifySyncMutation.mutate({ organizationId, storeId: primaryStore.storeId });
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {retryShopifySyncMutation.isPending ? 'Refreshing store data...' : 'Retry sync'}
            </Button>
          }
        >
          <div className="space-y-3">
            {shopifyRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
                No Shopify data refresh has completed yet.
              </div>
            ) : null}
            {shopifyRuns.slice(0, 5).map((run) => (
              <div key={run.syncRunId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{run.syncType.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-slate-400">
                      {formatNumber(run.recordsProcessed)} records processed
                    </p>
                  </div>
                  <StatusBadge value={run.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                  <p>Started {formatDateTime(run.startedAt)}</p>
                  <p>{run.completedAt ? `Completed ${formatDateTime(run.completedAt)}` : 'Still running'}</p>
                </div>
                {run.errorMessage ? (
                  <p className="mt-3 text-sm text-rose-300">{run.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <StripeSyncCard
          latestSync={stripeStatus?.latestSyncRun ?? null}
          connected={Boolean(stripeStatus?.connected)}
          canManage={canManageIntegrations}
          isSubmitting={runStripeSyncMutation.isPending}
          errorMessage={null}
          onRunSync={() => {
            if (!organizationId) {
              return;
            }

            runStripeSyncMutation.mutate(organizationId);
          }}
        />
      </div>
    </div>
  );
}
