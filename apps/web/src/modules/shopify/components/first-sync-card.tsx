'use client';

import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { ShopifySyncRunView } from '@/types/shopify';

export function FirstSyncCard({
  latestSync,
  isSubmitting,
  errorMessage,
  onRunSync,
}: {
  latestSync: ShopifySyncRunView | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onRunSync: () => void;
}) {
  const isPartialSuccess = latestSync?.status === 'PARTIAL_SUCCESS';
  const limitedAccess = Boolean(latestSync?.metadata?.protectedCustomerDataRequired);

  return (
    <SectionCard
      eyebrow="Step 2"
      title="Run the first data sync"
      description={
        isPartialSuccess
          ? 'Products are already flowing into Nexora. Order and customer coverage will unlock automatically once Shopify approves protected customer data for the app.'
          : 'Import orders, products, and customers into Nexora so insights can begin evaluating store performance.'
      }
    >
      <div className="space-y-4">
        {latestSync ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Most recent sync</p>
                <p className="text-base font-semibold text-white">
                  {formatNumber(latestSync.recordsProcessed)} records processed
                </p>
              </div>
              <StatusBadge value={latestSync.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="text-sm text-slate-300">
                Started {formatDateTime(latestSync.startedAt)}
              </p>
              <p className="text-sm text-slate-300">
                {latestSync.completedAt ? `Completed ${formatDateTime(latestSync.completedAt)}` : 'Still running'}
              </p>
            </div>
            {latestSync.errorMessage ? (
              <p className={`mt-3 text-sm ${isPartialSuccess ? 'text-amber-200' : 'text-rose-300'}`}>
                {latestSync.errorMessage}
              </p>
            ) : null}
            {limitedAccess ? (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
                Shopify store authorization succeeded and product sync is active. Order and customer sync will remain limited until Shopify grants protected customer data approval for this app.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            No sync has been completed yet. Run the first import to activate store insights.
          </div>
        )}

        {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

        <Button onClick={onRunSync} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Syncing Shopify data...' : 'Run First Sync'}
        </Button>

        <p className="text-xs text-slate-500">
          {limitedAccess
            ? 'Nexora will keep product connectivity live and expand into order and customer intelligence as soon as Shopify protected customer data approval is available.'
            : 'Nexora will sync orders, products, and customers. Intelligence becomes available as soon as the first sync completes successfully.'}
        </p>
      </div>
    </SectionCard>
  );
}
