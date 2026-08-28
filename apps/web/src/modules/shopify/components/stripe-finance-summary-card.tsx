import { AlertTriangle, CreditCard, DollarSign, ShieldAlert } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { formatNumber } from '@/lib/utils';
import { StripeFinanceSummary } from '@/types/stripe';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function StripeFinanceSummaryCard({
  summary,
}: {
  summary: StripeFinanceSummary | null;
}) {
  if (!summary?.connected) {
    return (
      <SectionCard
        eyebrow="Payments"
        title="Payments"
        variant="subtle"
        description="No Stripe data yet."
      >
        <div className="p-1 text-sm text-slate-400">
          No Stripe account connected yet.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Payments"
      title="Payments"
      variant="subtle"
      description="Confirmed revenue and payment risk."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStat
          icon={DollarSign}
          label="Confirmed revenue"
          value={formatCurrency(summary?.metrics.confirmedRevenueToday ?? 0)}
        />
        <FinanceStat
          icon={CreditCard}
          label="Failed payments"
          value={formatNumber(summary?.metrics.failedPaymentsCurrent24h ?? 0)}
        />
        <FinanceStat
          icon={AlertTriangle}
          label="Refunds"
          value={formatNumber(summary?.metrics.refundsCurrent24h ?? 0)}
        />
        <FinanceStat
          icon={ShieldAlert}
          label="Disputes"
          value={formatNumber(summary?.metrics.disputesCurrent24h ?? 0)}
        />
      </div>
    </SectionCard>
  );
}

function FinanceStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-[var(--brand-400)]" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
