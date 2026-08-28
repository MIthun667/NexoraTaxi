'use client';

import { AlertTriangle } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';

export function WeeklyRisksCard({ items }: { items?: string[] | null }) {
  return (
    <SectionCard
      eyebrow="Risks"
      title="What needs attention"
      variant="subtle"
      description="The most important risks and frictions surfaced in the current weekly digest."
    >
      <div className="space-y-3">
        {(items?.length ? items : ['No material weekly risks were identified.']).map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm text-slate-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
