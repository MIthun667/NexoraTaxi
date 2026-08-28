import { Activity, AlertTriangle, DollarSign, ShoppingBag, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/utils';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ShopifySummaryHero({
  summary,
  generatedAt,
  revenue,
  orders,
  newCustomers,
  activeSignals,
}: {
  summary: string;
  generatedAt: string;
  revenue: number;
  orders: number;
  newCustomers: number;
  activeSignals: number;
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.86))]">
      <div className="space-y-6 p-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-500)]">
            Shopify intelligence
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {summary}
            </h2>
            <p className="text-sm text-slate-300">
              Updated {formatDateTime(generatedAt)}.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HeroStat label="Revenue today" value={formatCurrency(revenue)} icon={DollarSign} />
          <HeroStat label="Orders today" value={formatNumber(orders)} icon={ShoppingBag} />
          <HeroStat label="New customers" value={formatNumber(newCustomers)} icon={Users} />
          <HeroStat label="Active signals" value={formatNumber(activeSignals)} icon={AlertTriangle} />
        </div>
      </div>
    </Card>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/8 text-[var(--brand-400)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
