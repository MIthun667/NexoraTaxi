'use client';

import { Loader2, RefreshCcw } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { StripeConnectionStatus } from '@/types/stripe';

export function StripeSyncCard({
  latestSync,
  connected,
  canManage,
  isSubmitting,
  errorMessage,
  onRunSync,
}: {
  latestSync: StripeConnectionStatus['latestSyncRun'];
  connected: boolean;
  canManage: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onRunSync: () => void;
}) {
  return (
    <SectionCard
      eyebrow="Stripe sync"
      title="Sync Stripe activity"
      description="Refresh charges and payment events."
    >
      <div className="space-y-4">
        {latestSync ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Latest sync</p>
                <p className="text-base font-semibold text-white">
                  {formatNumber(latestSync.recordsProcessed)} records processed
                </p>
              </div>
              <StatusBadge value={latestSync.status} />
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Started {formatDateTime(latestSync.startedAt)}
            </p>
            {latestSync.completedAt ? (
              <p className="text-sm text-slate-300">
                Completed {formatDateTime(latestSync.completedAt)}
              </p>
            ) : null}
            {latestSync.errorMessage ? (
              <p className="mt-3 text-sm text-rose-300">{latestSync.errorMessage}</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            No Stripe sync yet.
          </div>
        )}

        {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

        {!canManage ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            Manager access required.
          </div>
        ) : null}

        <Button onClick={onRunSync} disabled={!connected || !canManage || isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Syncing Stripe...' : 'Run Stripe sync'}
        </Button>
      </div>
    </SectionCard>
  );
}
