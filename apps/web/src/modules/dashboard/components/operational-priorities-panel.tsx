'use client';

import { SectionCard } from '@/components/layout/section-card';
import { IntelligencePriorityItem } from '@/lib/command-intelligence';

export function OperationalPrioritiesPanel({
  items,
}: {
  items: IntelligencePriorityItem[];
}) {
  return (
    <SectionCard
      eyebrow="Operational intelligence"
      title="Where execution pressure is concentrating"
      description="A compact priority view for coverage, backlog, and readiness bottlenecks."
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
              <span className={toneBadgeClassName(item.tone)}>
                {toneLabel(item.tone)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{item.summary}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function toneLabel(tone: IntelligencePriorityItem['tone']) {
  if (tone === 'critical') return 'Intervene';
  if (tone === 'watch') return 'Watch';
  if (tone === 'opportunity') return 'Advance';
  return 'Stable';
}

function toneBadgeClassName(tone: IntelligencePriorityItem['tone']) {
  if (tone === 'critical') {
    return 'inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100';
  }

  if (tone === 'watch') {
    return 'inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100';
  }

  if (tone === 'opportunity') {
    return 'inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100';
  }

  return 'inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100';
}
