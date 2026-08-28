'use client';

import { SectionCard } from '@/components/layout/section-card';

export function DataCoverageCard({
  productsCoverage,
  ordersCoverage,
  customersCoverage,
  paymentsCoverage,
}: {
  productsCoverage: number;
  ordersCoverage: number;
  customersCoverage: number;
  paymentsCoverage: number;
}) {
  return (
    <SectionCard
      eyebrow="Coverage"
      title="Data coverage"
      description="How much of the commerce operating picture Nexora can verify right now."
    >
      <div className="space-y-4">
        <CoverageRow label="Products" value={productsCoverage} state="active" />
        <CoverageRow label="Orders" value={ordersCoverage} state={ordersCoverage < 100 ? 'restricted' : 'active'} />
        <CoverageRow
          label="Customers"
          value={customersCoverage}
          state={customersCoverage < 100 ? 'restricted' : 'active'}
        />
        <CoverageRow
          label="Payments"
          value={paymentsCoverage}
          state={paymentsCoverage === 0 ? 'missing' : paymentsCoverage < 100 ? 'restricted' : 'active'}
        />
      </div>
    </SectionCard>
  );
}

function CoverageRow({
  label,
  value,
  state,
}: {
  label: string;
  value: number;
  state: 'active' | 'restricted' | 'missing';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass =
    state === 'active'
      ? 'bg-emerald-400'
      : state === 'restricted'
        ? 'bg-amber-300'
        : 'bg-slate-600';
  const text =
    state === 'active'
      ? `${clamped}%`
      : state === 'restricted'
        ? `${clamped}% (restricted)`
        : `${clamped}% (not connected)`;

  return (
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{text}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-900/80">
        <div
          className={`h-full rounded-full transition-[width] ${fillClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
