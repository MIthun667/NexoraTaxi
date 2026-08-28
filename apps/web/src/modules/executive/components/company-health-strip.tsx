'use client';

import { cn, formatNumber } from '@/lib/utils';
import { ExecutiveStatusCard } from '@/types/executive';

const toneStyles = {
  neutral: 'border-white/10 bg-white/[0.03] text-white',
  info: 'border-sky-400/15 bg-sky-400/10 text-sky-100',
  warning: 'border-amber-400/15 bg-amber-400/10 text-amber-100',
  danger: 'border-rose-400/15 bg-rose-400/10 text-rose-100',
  success: 'border-emerald-400/15 bg-emerald-400/10 text-emerald-100',
} as const;

export function CompanyHealthStrip({ items }: { items: ExecutiveStatusCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.title}
          className={cn(
            'rounded-3xl border p-5 shadow-[0_18px_45px_rgba(2,6,23,0.22)]',
            toneStyles[item.tone],
            item.highlight ? 'ring-1 ring-current/20' : '',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{item.title}</p>
          <p className="mt-4 text-3xl font-semibold">
            {formatNumber(item.value)}
            {item.unit ?? ''}
          </p>
          <p className="mt-3 text-sm leading-6 opacity-90">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
