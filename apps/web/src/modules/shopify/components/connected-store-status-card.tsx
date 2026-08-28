'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, CreditCard, RefreshCcw, ShieldCheck, Store } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/utils';
import { ConnectedStoreStatus } from '@/types/shopify-intelligence';

type StoreActionHandlers = {
  onRetryShopifySync?: () => void;
  onRetryStripeSync?: () => void;
};

export function ConnectedStoreStatusCard({
  store,
  canManage,
  isRetryingShopify,
  isRetryingStripe,
  handlers,
}: {
  store: ConnectedStoreStatus;
  canManage: boolean;
  isRetryingShopify?: boolean;
  isRetryingStripe?: boolean;
  handlers?: StoreActionHandlers;
}) {
  return (
    <SectionCard
      title={store.storeName}
      description={store.recommendedNextStep}
      variant="subtle"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={connectionStatusLabel(store.connectionStatus)} />
          <StatusBadge value={syncStateLabel(store.latestShopifySyncState)} />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StoreStatusStat
            icon={Store}
            label="Platform"
            value="Shopify"
            subvalue={`Coverage ${coverageLabel(store.coverageStatus)}`}
          />
          <StoreStatusStat
            icon={ShieldCheck}
            label="Shopify"
            value={integrationLabel(store.shopifyStatus)}
            subvalue={syncDetail('Last synced', store.lastSuccessfulShopifySyncAt, store.latestShopifySyncState)}
          />
          <StoreStatusStat
            icon={CreditCard}
            label="Payments"
            value={integrationLabel(store.stripeStatus)}
            subvalue={syncDetail('Last synced', store.lastSuccessfulStripeSyncAt, store.latestStripeSyncState)}
          />
          <StoreStatusStat
            icon={AlertTriangle}
            label="Next Step"
            value={store.recommendedNextStep}
            subvalue={store.limitations[0] ?? 'No active limitations'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={integrationLabel(store.shopifyStatus)} />
          <StatusBadge value={integrationLabel(store.stripeStatus)} />
          <StatusBadge value={coverageLabel(store.coverageStatus)} />
        </div>

        <StoreBulletList title="Current limitations" items={store.limitations} emptyLabel="No active limitations." />

        <div className="flex flex-wrap items-center gap-2">
          {store.actionsAvailable.includes('retry_shopify_sync') ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!canManage || isRetryingShopify}
              onClick={handlers?.onRetryShopifySync}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isRetryingShopify ? 'Retrying store sync...' : 'Retry sync'}
            </Button>
          ) : null}
          {store.actionsAvailable.includes('retry_stripe_sync') ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!canManage || isRetryingStripe}
              onClick={handlers?.onRetryStripeSync}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isRetryingStripe ? 'Retrying payments sync...' : 'Retry payments sync'}
            </Button>
          ) : null}
          {store.actionsAvailable.includes('connect_payments') ? (
            <Link href="/shopify/finance-intelligence">
              <Button size="sm" variant="outline">
                <CreditCard className="mr-2 h-4 w-4" />
                Connect payments
              </Button>
            </Link>
          ) : null}
          {store.actionsAvailable.includes('review_permissions') ? (
            <Link href="/shopify/sync-health">
              <Button size="sm" variant="ghost">
                Review permissions
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : null}
          {store.actionsAvailable.includes('reconnect_store') ? (
            <Link href="/shopify/onboarding">
              <Button size="sm" variant="outline">
                Reconnect store
              </Button>
            </Link>
          ) : null}
          {store.actionsAvailable.includes('wait_for_initial_sync') ? (
            <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
              Initial sync in progress
            </span>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

export function ConnectedStoreCompactList({
  stores,
}: {
  stores: ConnectedStoreStatus[];
}) {
  return (
    <div className="space-y-3">
      {stores.map((store) => (
        <div
          key={store.storeId}
          className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-100">{store.storeName}</p>
            <p className="text-sm text-slate-400">{store.recommendedNextStep}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={connectionStatusLabel(store.connectionStatus)} />
            <StatusBadge value={integrationLabel(store.shopifyStatus)} />
            <StatusBadge value={integrationLabel(store.stripeStatus)} />
            <StatusBadge value={coverageLabel(store.coverageStatus)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StoreStatusStat({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subvalue}</p>
    </div>
  );
}

function StoreBulletList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}-${item}`} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function connectionStatusLabel(status: string) {
  if (status === 'attention_required') {
    return 'Issue';
  }

  if (status === 'connecting') {
    return 'Pending';
  }

  if (status === 'connected') {
    return 'Healthy';
  }

  return 'Neutral';
}

function integrationLabel(status: string) {
  const mapping: Record<string, string> = {
    connected: 'Healthy',
    limited: 'Limited',
    delayed: 'Delayed',
    stale: 'Stale',
    failed: 'Issue',
    not_connected: 'Unavailable',
    not_applicable: 'Neutral',
  };

  return mapping[status] ?? 'Neutral';
}

function coverageLabel(status: string) {
  const mapping: Record<string, string> = {
    full: 'Healthy',
    partial: 'Limited',
    minimal: 'Limited',
    unavailable: 'Issue',
  };

  return mapping[status] ?? 'Neutral';
}

function syncStateLabel(state: string) {
  const mapping: Record<string, string> = {
    success: 'Healthy',
    in_progress: 'Pending',
    delayed: 'Delayed',
    failed: 'Issue',
    never_synced: 'Pending',
    not_connected: 'Neutral',
  };

  return mapping[state] ?? 'Neutral';
}

function syncDetail(prefix: string, lastSuccessfulSyncAt: string | null, latestSyncState: string) {
  if (lastSuccessfulSyncAt) {
    return `${prefix} ${formatDateTime(lastSuccessfulSyncAt)}`;
  }

  if (latestSyncState === 'in_progress' || latestSyncState === 'never_synced') {
    return 'Initial sync in progress';
  }

  if (latestSyncState === 'not_connected') {
    return 'Not connected';
  }

  return 'No successful sync recorded yet';
}
