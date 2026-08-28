'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { ShopifyConnectionStatus } from '@/types/shopify';

export function ShopifyStatus({
  status,
  requestAccessHref = '/shopify/onboarding',
}: {
  status: ShopifyConnectionStatus | null;
  requestAccessHref?: string;
}) {
  const mode = status?.partiallySynced || status?.limitedAccess ? 'Partial' : status?.fullySynced ? 'Full' : 'Pending';

  return (
    <SectionCard
      eyebrow="Integration"
      title="Shopify status"
      description="Connection health and current operating mode for the Shopify integration."
      actions={
        <Link href={requestAccessHref as Route}>
          <Button variant="outline" size="sm">
            Request full access
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatusPill label="Status" value={status?.connected ? 'Connected' : 'Awaiting connection'} state={status?.connected ? 'active' : 'blocked'} />
          <StatusPill label="Mode" value={mode} state={mode === 'Full' ? 'active' : mode === 'Partial' ? 'partial' : 'blocked'} />
          <StatusPill label="Products" value={status?.capabilities.productsAvailable ? 'Synced' : 'Waiting'} state={status?.capabilities.productsAvailable ? 'active' : 'blocked'} />
          <StatusPill label="Orders" value={status?.capabilities.ordersAvailable ? 'Available' : 'Restricted'} state={status?.capabilities.ordersAvailable ? 'active' : 'blocked'} />
          <StatusPill label="Customers" value={status?.capabilities.customersAvailable ? 'Available' : 'Restricted'} state={status?.capabilities.customersAvailable ? 'active' : 'blocked'} />
        </div>

        {status?.limitedAccess ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
            Shopify is connected and product sync is active. Orders and customers remain restricted until protected data access is approved.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function StatusPill({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: 'active' | 'partial' | 'blocked';
}) {
  const Icon = state === 'active' ? CheckCircle2 : state === 'partial' ? ShieldAlert : XCircle;
  const iconColor =
    state === 'active' ? 'text-emerald-300' : state === 'partial' ? 'text-amber-300' : 'text-rose-300';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
