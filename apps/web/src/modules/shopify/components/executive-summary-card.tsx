'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { ShopifyAiExecutiveSummary } from '@/types/shopify-intelligence';

export function ExecutiveSummaryCard({
  executiveSummary,
  limitedAccess,
  revenue,
  orders,
  customers,
  isLoading,
  canRefresh,
  isRefreshing,
  onRefresh,
}: {
  executiveSummary?: ShopifyAiExecutiveSummary | null;
  limitedAccess: boolean;
  revenue: number;
  orders: number;
  customers: number;
  isLoading?: boolean;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}) {
  const riskCount = executiveSummary?.risks?.length ?? 0;
  const risk = riskCount > 1 ? 'High' : riskCount === 1 ? 'Watch' : 'Low';

  if (isLoading && !executiveSummary) {
    return (
      <SectionCard
        eyebrow="Today's Summary"
        title="Daily Brief"
      >
        <div className="grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Today's Summary"
      title="Daily Brief"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!canRefresh || isRefreshing}
        >
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Refresh Summary
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        <StateTile label="System Status" value={limitedAccess ? 'Limited' : 'Full'} />
        <StateTile label="Revenue" value={formatCurrency(revenue)} />
        <StateTile label="Orders" value={formatNumber(orders)} />
        <StateTile label="Customers" value={formatNumber(customers)} />
        <StateTile label="Risk" value={risk} />
      </div>
    </SectionCard>
  );
}

function StateTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
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
