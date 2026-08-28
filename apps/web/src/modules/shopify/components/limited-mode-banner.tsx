'use client';

import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';

import { Card } from '@/components/ui/card';

type StateTone = 'active' | 'partial' | 'blocked';

function StatePill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: StateTone;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs text-white">
      {tone === 'active' ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
      ) : tone === 'partial' ? (
        <ShieldAlert className="h-3.5 w-3.5 text-amber-200" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-rose-300" />
      )}
      <span className="text-slate-300">{label}:</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}

export function LimitedModeBanner({
  limitedAccess,
  stripeConnected,
}: {
  limitedAccess: boolean;
  stripeConnected: boolean;
}) {
  const items = [
    {
      label: 'System',
      value: limitedAccess ? 'Limited' : 'Full',
      tone: limitedAccess ? ('partial' as const) : ('active' as const),
    },
    { label: 'Products', value: 'Synced', tone: 'active' as const },
    {
      label: 'Orders',
      value: limitedAccess ? 'Restricted' : 'Synced',
      tone: limitedAccess ? ('blocked' as const) : ('active' as const),
    },
    {
      label: 'Customers',
      value: limitedAccess ? 'Restricted' : 'Synced',
      tone: limitedAccess ? ('blocked' as const) : ('active' as const),
    },
    {
      label: 'Stripe',
      value: stripeConnected ? 'Connected' : 'Not connected',
      tone: stripeConnected ? ('active' as const) : ('partial' as const),
    },
  ];

  return (
    <Card className="border-amber-400/20 bg-amber-500/[0.07] p-0">
      <div className="rounded-2xl border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(15,23,42,0.02))] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
            <ShieldAlert className="h-4 w-4" />
            Operating state
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <StatePill
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
