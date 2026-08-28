'use client';

import { formatNumber } from '@/lib/utils';

export function SignalBarList({
  items,
  colorClass = 'bg-[var(--brand-500)]/80',
  emptyMessage = 'No data available.',
}: {
  items: Array<{
    label: string;
    value: number;
    tone?: 'default' | 'danger' | 'info' | 'success';
  }>;
  colorClass?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">{emptyMessage}</div>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0);
        const toneClass =
          item.tone === 'danger'
            ? 'bg-rose-400/80'
            : item.tone === 'info'
              ? 'bg-sky-400/80'
              : item.tone === 'success'
                ? 'bg-emerald-400/80'
                : colorClass;

        return (
          <div key={`${item.label}-${item.value}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">{item.label}</span>
              <span className="font-medium text-white">{formatNumber(item.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5">
              <div className={`h-2 rounded-full transition-all ${toneClass}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
