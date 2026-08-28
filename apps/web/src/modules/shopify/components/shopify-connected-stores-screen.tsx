'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CreditCard, Filter, Store } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { useConnectShopify } from '@/hooks/queries/use-shopify';
import { useStripeStatus, useConnectStripe } from '@/hooks/queries/use-stripe';
import {
  useCommerceDataTrust,
  useConnectedStores,
  useRetryConnectedStoreShopifySync,
  useRetryConnectedStoreStripeSync,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';
import { ConnectedStoreStatus } from '@/types/shopify-intelligence';

import { ConnectedStoreStatusCard } from './connected-store-status-card';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { ConnectShopifyCard } from './connect-shopify-card';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { StripeConnectionCard } from './stripe-connection-card';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyConnectedStoresScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canManageIntegrations = hasPermission(permissionLabels.organizationManage);
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'attention_required' | 'connected' | 'not_connected'>('all');
  const [paymentsFilter, setPaymentsFilter] = useState<'all' | 'connected' | 'not_connected' | 'attention_required'>('all');

  const connectedStoresQuery = useConnectedStores(organizationId);
  const stripeStatusQuery = useStripeStatus(organizationId);
  const trustQuery = useCommerceDataTrust(organizationId);
  const connectShopifyMutation = useConnectShopify();
  const connectStripeMutation = useConnectStripe();
  const retryShopifySyncMutation = useRetryConnectedStoreShopifySync();
  const retryStripeSyncMutation = useRetryConnectedStoreStripeSync();

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [connectedStoresQuery.error, stripeStatusQuery.error, trustQuery.error],
  });

  if (activeContext.isLoading || connectedStoresQuery.isLoading || stripeStatusQuery.isLoading || trustQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Stores need a single organization scope"
          description="Choose one organization before linking Shopify, connecting Stripe, or running syncs."
        />
      </div>
    );
  }

  if (connectedStoresQuery.isError || stripeStatusQuery.isError || trustQuery.isError) {
    return (
      <DashboardErrorState
        onRetry={() => {
          connectedStoresQuery.refetch();
          stripeStatusQuery.refetch();
          trustQuery.refetch();
        }}
      />
    );
  }

  const stores = connectedStoresQuery.data ?? [];
  const stripeStatus = stripeStatusQuery.data ?? null;
  const trust = trustQuery.data ?? null;
  const defaultShopDomain = stores.find((store) => store.storeId !== 'not-connected')?.storeName ?? '';
  const filteredStores = useMemo(
    () =>
      stores.filter((store) => matchesConnectionFilter(store, connectionFilter)).filter((store) =>
        matchesPaymentsFilter(store, paymentsFilter),
      ),
    [stores, connectionFilter, paymentsFilter],
  );
  const hasConnectedStore = stores.some((store) => store.storeId !== 'not-connected');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/shopify/sync-health">
          <Button variant="outline">
            <Store className="mr-2 h-4 w-4" />
            Data Status
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <CommerceDataTrustPanel
        trust={trust}
        title="Stores"
        description="Operational status for store connectivity, sync freshness, and current visibility across your commerce integrations."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Filter className="h-4 w-4 text-slate-400" />
          Filter stores
        </div>
        <select
          className="rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
          value={connectionFilter}
          onChange={(event) =>
            setConnectionFilter(event.target.value as 'all' | 'attention_required' | 'connected' | 'not_connected')
          }
        >
          <option value="all">All connection states</option>
          <option value="attention_required">Attention required</option>
          <option value="connected">Connected</option>
          <option value="not_connected">Not connected</option>
        </select>
        <select
          className="rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
          value={paymentsFilter}
          onChange={(event) =>
            setPaymentsFilter(event.target.value as 'all' | 'connected' | 'not_connected' | 'attention_required')
          }
        >
          <option value="all">All payments states</option>
          <option value="connected">Payments connected</option>
          <option value="not_connected">Payments unavailable</option>
          <option value="attention_required">Payments attention required</option>
        </select>
      </div>

      {filteredStores.length === 0 ? (
        <EmptyState
          title="No stores match the current filters."
          description="Adjust the filters to review connected stores, payments visibility, and attention states."
        />
      ) : (
        <div className="grid gap-6">
          {filteredStores.map((store) => (
            <ConnectedStoreStatusCard
              key={store.storeId}
              store={store}
              canManage={canManageIntegrations}
              isRetryingShopify={
                retryShopifySyncMutation.isPending && retryShopifySyncMutation.variables?.storeId === store.storeId
              }
              isRetryingStripe={
                retryStripeSyncMutation.isPending && retryStripeSyncMutation.variables?.storeId === store.storeId
              }
              handlers={{
                onRetryShopifySync: () => {
                  if (!organizationId || store.storeId === 'not-connected') {
                    return;
                  }

                  retryShopifySyncMutation.mutate({ organizationId, storeId: store.storeId });
                },
                onRetryStripeSync: () => {
                  if (!organizationId || store.storeId === 'not-connected') {
                    return;
                  }

                  retryStripeSyncMutation.mutate({ organizationId, storeId: store.storeId });
                },
              }}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <ConnectShopifyCard
          defaultShopDomain={hasConnectedStore ? defaultShopDomain : ''}
          isSubmitting={connectShopifyMutation.isPending}
          errorMessage={null}
          onSubmit={async (shopDomain) => {
            if (!organizationId) {
              return;
            }

            try {
              const response = await connectShopifyMutation.mutateAsync({
                organizationId,
                shopDomain,
              });
              window.location.assign(response.installUrl);
            } catch {
              // Inline mutation state handles the product error state.
            }
          }}
        />
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
      </div>
    </div>
  );
}

function matchesConnectionFilter(
  store: ConnectedStoreStatus,
  filter: 'all' | 'attention_required' | 'connected' | 'not_connected',
) {
  if (filter === 'all') {
    return true;
  }

  return store.connectionStatus === filter;
}

function matchesPaymentsFilter(
  store: ConnectedStoreStatus,
  filter: 'all' | 'connected' | 'not_connected' | 'attention_required',
) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'connected') {
    return store.stripeStatus === 'connected';
  }

  if (filter === 'not_connected') {
    return store.stripeStatus === 'not_connected';
  }

  return ['failed', 'stale', 'delayed'].includes(store.stripeStatus);
}
