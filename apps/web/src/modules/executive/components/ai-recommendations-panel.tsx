'use client';

import Link from 'next/link';

import { SectionCard } from '@/components/layout/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExecutiveRecommendationItem } from '@/types/executive';

export function AiRecommendationsPanel({
  recommendations,
}: {
  recommendations: ExecutiveRecommendationItem[];
}) {
  return (
    <SectionCard
      eyebrow="AI recommendations"
      title="Leadership-level next actions"
      description="Recommended decisions are grouped by business impact area and kept separate from raw events."
    >
      <div className="space-y-4">
        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {recommendation.impactArea}
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">{recommendation.title}</h3>
              </div>
              <StatusBadge value={recommendation.confidence} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{recommendation.reason}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={(recommendation.actionHref ?? '/ai/overview') as never}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-500)] px-4 text-sm font-medium text-slate-950 transition hover:bg-[var(--brand-400)]"
              >
                {recommendation.actionLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
