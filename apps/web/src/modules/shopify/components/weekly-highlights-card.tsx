'use client';

import { SectionCard } from '@/components/layout/section-card';

export function WeeklyHighlightsCard({ items }: { items?: string[] | null }) {
  return (
    <SectionCard
      eyebrow="Highlights"
      title="What improved"
      variant="subtle"
      description="The strongest movements and wins captured in this week’s operating picture."
    >
      <div className="space-y-3">
        {(items?.length ? items : ['No major highlights were recorded for this week yet.']).map((item) => (
          <div key={item} className="flex gap-3 rounded-xl px-2 py-2 text-sm text-slate-200">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
