'use client';

import { CreditCard, Loader2, RefreshCcw } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StripeConnectionStatus, StripeFinanceSummary } from '@/types/stripe';
import { useState } from 'react';

export function FinanceOverviewCard({
  status,
  summary,
  canManage,
  isConnecting,
  isSyncing,
  errorMessage,
  onSubmit,
  onRunSync,
}: {
  status: StripeConnectionStatus | null;
  summary: StripeFinanceSummary | null;
  canManage: boolean;
  isConnecting?: boolean;
  isSyncing?: boolean;
  errorMessage?: string | null;
  onSubmit: (secretKey: string) => void;
  onRunSync: () => void;
}) {
  const [secretKey, setSecretKey] = useState('');

  return (
    <SectionCard
      eyebrow="Finance"
      title="Finance"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRunSync}
            disabled={!canManage || !status?.connected || isSyncing}
          >
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Run sync
          </Button>
          {!status?.connected ? (
            <Button
              size="sm"
              onClick={() => onSubmit(secretKey)}
              disabled={!canManage || !secretKey.trim() || isConnecting}
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Connect Stripe
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <StateRow label="Stripe" value={status?.connected ? 'Connected' : 'Not connected'} />
          <StateRow
            label="Sync"
            value={status?.latestSyncRun?.status ? status.latestSyncRun.status.replaceAll('_', ' ') : 'Not run'}
          />
          <StateRow
            label="Revenue"
            value={summary?.connected ? formatCurrency(summary.metrics.confirmedRevenueToday) : 'Unavailable'}
          />
          <StateRow
            label="Refunds"
            value={summary?.connected ? String(summary.metrics.refundsCurrent24h) : 'Unavailable'}
          />
        </div>

        {!status?.connected && canManage ? (
          <Input
            id="stripeSecretKey"
            type="password"
            value={secretKey}
            onChange={(event) => setSecretKey(event.target.value)}
            placeholder="Stripe secret key"
            autoComplete="off"
            spellCheck={false}
          />
        ) : null}

        {!canManage ? <p className="text-xs text-slate-400">Manager access required</p> : null}
        {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      </div>
    </SectionCard>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
