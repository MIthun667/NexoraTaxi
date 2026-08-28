'use client';

import { SectionCard } from '@/components/layout/section-card';

export function RoiHighlightsList({
  items,
}: {
  items: string[];
}) {
  return (
    <SectionCard
      title="ROI Highlights"
      description="Where Nexora is creating measurable value or where measurement is still limited."
      variant="subtle"
    >
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">Outcome analytics will become available once Nexora actions and reviews accumulate.</p>
      ) : (
        <ul className="space-y-2.5 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`roi-${index}-${item}`} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
