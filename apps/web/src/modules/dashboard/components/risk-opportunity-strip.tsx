'use client';

import { IntelligenceStripItem } from '@/lib/command-intelligence';

export function RiskOpportunityStrip({
  items,
}: {
  items: IntelligenceStripItem[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-3xl border p-5 ${toneContainerClassName(item.tone)}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {item.category}
          </p>
          <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-200">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}

function toneContainerClassName(tone: IntelligenceStripItem['tone']) {
  if (tone === 'critical') {
    return 'border-rose-500/20 bg-[linear-gradient(135deg,rgba(225,29,72,0.12),rgba(15,23,42,0.6))]';
  }

  if (tone === 'watch') {
    return 'border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(15,23,42,0.6))]';
  }

  if (tone === 'opportunity') {
    return 'border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(15,23,42,0.6))]';
  }

  return 'border-white/10 bg-white/[0.03]';
}
