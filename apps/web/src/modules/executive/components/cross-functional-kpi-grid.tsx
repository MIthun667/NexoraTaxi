'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { formatNumber } from '@/lib/utils';
import { CrossFunctionalKpiItem } from '@/types/executive';

export function CrossFunctionalKpiGrid({ items }: { items: CrossFunctionalKpiItem[] }) {
  return (
    <SectionCard
      eyebrow="Cross-functional KPIs"
      title="Leadership metrics"
      description="Blended indicators spanning workforce, assets, execution, incidents, approvals, and AI verification."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {formatNumber(item.value)}
                  {item.suffix ?? ''}
                </p>
              </div>
              <TrendIcon direction={item.trendDirection} />
            </div>
            <p className="mt-3 text-sm text-slate-400">{item.description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--brand-500)]">
              {item.trendLabel}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') {
    return <ArrowUpRight className="h-5 w-5 text-emerald-300" />;
  }

  if (direction === 'down') {
    return <ArrowDownRight className="h-5 w-5 text-rose-300" />;
  }

  return <ArrowRight className="h-5 w-5 text-slate-400" />;
}
