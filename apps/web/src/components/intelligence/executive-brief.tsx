'use client';

import { ArrowRight } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';

export function ExecutiveBrief({
  systemMode,
  revenueToday,
  ordersToday,
}: {
  systemMode: 'partial' | 'full' | 'empty';
  revenueToday: number;
  ordersToday: number;
}) {
  return (
    <SectionCard
      eyebrow="Executive brief"
      title="AI Commerce Intelligence Surface"
      description="A concise operating brief that reflects current data coverage, risks, and intelligence confidence."
    >
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.82))] p-6">
        {systemMode === 'partial' ? (
          <div className="space-y-5 text-slate-200">
            <p className="text-lg leading-8 text-white">
              Nexora is currently operating in Limited Intelligence Mode.
            </p>
            <p className="text-sm leading-7 text-slate-300">
              Product visibility is active, but order and customer data are restricted.
            </p>
            <div className="space-y-2 text-sm leading-7">
              <p>Impact:</p>
              <ul className="space-y-1 text-slate-300">
                <li>• Revenue signals are incomplete</li>
                <li>• Customer insights are unavailable</li>
                <li>• Retention intelligence is suppressed</li>
              </ul>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current system state</p>
                <p className="mt-3 text-sm text-white">Orders today: {ordersToday} (not fully verified)</p>
                <p className="mt-1 text-sm text-white">Revenue: {formatCurrency(revenueToday)} (partial visibility)</p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Recommended priority</p>
                <div className="mt-3 space-y-2 text-sm text-amber-50">
                  <p className="flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Unlock protected Shopify access</p>
                  <p className="flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Connect Stripe</p>
                </div>
              </div>
            </div>
          </div>
        ) : systemMode === 'empty' ? (
          <p className="text-sm leading-7 text-slate-300">
            Awaiting data connection. Nexora will produce a fuller executive brief as soon as Shopify or Stripe telemetry starts flowing.
          </p>
        ) : (
          <div className="space-y-4 text-slate-200">
            <p className="text-lg leading-8 text-white">
              Nexora is operating with full commerce intelligence coverage.
            </p>
            <p className="text-sm leading-7 text-slate-300">
              Shopify demand, customer behavior, and payment validation can now be reviewed together as one operating narrative.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current system state</p>
                <p className="mt-3 text-sm text-white">Orders today: {ordersToday}</p>
                <p className="mt-1 text-sm text-white">Revenue: {formatCurrency(revenueToday)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-100">
                Commerce demand, customer health, and payment validation are all contributing to the operating brief.
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
