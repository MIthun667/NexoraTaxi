'use client';

import { SectionCard } from '@/components/layout/section-card';

export function ExecutiveFocusList({
  items,
}: {
  items: string[];
}) {
  return (
    <SectionCard
      title="Executive Focus"
      description="What leadership should pay attention to next."
      variant="subtle"
    >
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">No major issues require leadership attention right now.</p>
      ) : (
        <ul className="space-y-2.5 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`focus-${index}-${item}`} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
