'use client';

import { SectionCard } from '@/components/layout/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExecutiveAnswerResponse } from '@/types/shopify-intelligence';

export function ExecutiveAnswerCard({
  answer,
}: {
  answer: ExecutiveAnswerResponse | null;
}) {
  if (!answer) {
    return null;
  }

  return (
    <SectionCard
      title="Executive Answer"
      description="Grounded response from Nexora’s current trust, signals, recommendations, actions, and governed agent context."
      variant="subtle"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={answer.trustState} />
          <StatusBadge value={answer.confidence} />
        </div>

        <p className="max-w-3xl text-sm leading-6 text-slate-200">{answer.answer}</p>

        {answer.limitations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Limitations</p>
            <ul className="space-y-1.5 text-sm text-slate-400">
              {answer.limitations.map((item, index) => (
                <li key={`limitation-${index}-${item}`} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <ReferenceList
            title="Sources"
            items={answer.sources.map((source) => ({
              key: `${source.type}-${source.id}`,
              label: source.title,
              detail: source.detail ?? null,
            }))}
          />
          <ReferenceList
            title="Follow-Up Questions"
            items={answer.suggestedFollowUps.map((item, index) => ({
              key: `follow-up-${index}-${item}`,
              label: item,
              detail: null,
            }))}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function ReferenceList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; label: string; detail: string | null }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No references are available.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
              <p className="text-sm text-slate-200">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs text-slate-500">{item.detail}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
