'use client';

import { SectionCard } from '@/components/layout/section-card';
import { OutcomeEffectivenessItem } from '@/types/shopify-intelligence';

export function RecommendationEffectivenessPanel({
  topEffective,
  weaker,
}: {
  topEffective: OutcomeEffectivenessItem[];
  weaker: OutcomeEffectivenessItem[];
}) {
  return (
    <SectionCard
      title="Recommendation Effectiveness"
      description="How recommendation and proposal types are performing based on recorded outcomes, review patterns, and execution follow-through."
      variant="subtle"
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <EffectivenessList title="Stronger Types" items={topEffective} />
        <EffectivenessList title="Weaker Types" items={weaker} />
      </div>
    </SectionCard>
  );
}

function EffectivenessList({
  title,
  items,
}: {
  title: string;
  items: OutcomeEffectivenessItem[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">There is not enough recent activity to evaluate recommendation effectiveness yet.</p>
      ) : (
        items.map((item) => (
          <article key={`${title}-${item.type}`} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-4">
            <p className="text-sm font-semibold text-slate-100">{humanize(item.type)}</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
              <p>Usage: {item.usageCount}</p>
              <p>Positive outcomes: {formatPercent(item.positiveOutcomeRate)}</p>
              <p>Approval rate: {formatPercent(item.operatorApprovalRate)}</p>
              <p>Execution success: {formatPercent(item.executionSuccessRate)}</p>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
