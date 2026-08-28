import { ArrowUpRight, Package2 } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { formatNumber } from '@/lib/utils';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopProductCard({
  product,
}: {
  product: {
    title: string;
    revenue: number;
    unitsSold: number;
  };
}) {
  return (
    <SectionCard
      eyebrow="Product leader"
      title={product.title}
      description="Top product in the recent 30-day window."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(15,23,42,0.3))] p-5">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Revenue contribution</p>
            <p className="text-3xl font-semibold text-white">{formatCurrency(product.revenue)}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-white/[0.06] text-[var(--brand-400)]">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Units sold</p>
              <Package2 className="h-4 w-4 text-[var(--brand-400)]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(product.unitsSold)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Average revenue per unit</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {formatCurrency(product.unitsSold > 0 ? product.revenue / product.unitsSold : product.revenue)}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
