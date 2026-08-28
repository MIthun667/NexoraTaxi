'use client';

import { ReactNode } from 'react';

import { SectionCard } from '@/components/layout/section-card';
import { ShopifyAiWeeklyDigest } from '@/types/shopify-intelligence';

type WeeklyDigestHeroProps = {
  digest: ShopifyAiWeeklyDigest;
  actions?: ReactNode;
};

export function WeeklyDigestHero({ digest, actions }: WeeklyDigestHeroProps) {
  return (
    <SectionCard
      eyebrow="Week to Date"
      title={`${formatShortDate(digest.weekStartDate)} - ${formatShortDate(digest.weekEndDate)}`}
      description="A grounded weekly brief across commerce demand, payments, customer health, and governance activity."
      actions={actions}
    >
      <div className="space-y-4">
        <p className="max-w-3xl text-sm leading-7 text-slate-200">{digest.summary}</p>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Shopify revenue" value={formatCurrency(digest.metrics.commerce.revenueCurrent)} />
          <Metric label="Orders" value={String(digest.metrics.commerce.ordersCurrent)} />
          <Metric label="New customers" value={String(digest.metrics.commerce.newCustomersCurrent)} />
          <Metric label="Reviews completed" value={String(digest.metrics.governance.reviewsCompleted)} />
        </div>
      </div>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
