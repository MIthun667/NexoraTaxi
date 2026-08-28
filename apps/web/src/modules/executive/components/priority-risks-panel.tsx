'use client';

import Link from 'next/link';

import { SectionCard } from '@/components/layout/section-card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { ExecutiveRiskItem } from '@/types/executive';

export function PriorityRisksPanel({ risks }: { risks: ExecutiveRiskItem[] }) {
  return (
    <SectionCard
      eyebrow="Priority risks"
      title="What leadership should watch now"
      description="Cross-functional risks ranked by current business impact, not raw event volume."
    >
      <div className="space-y-4">
        {risks.map((risk) => (
          <div key={risk.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {risk.category}
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">{risk.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{risk.affectedArea}</p>
              </div>
              <SeverityBadge value={risk.severity} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{risk.explanation}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <span className="font-medium">Suggested action:</span> {risk.suggestedAction}
            </div>
            {risk.evidenceHref ? (
              <div className="mt-4">
                <Link
                  href={risk.evidenceHref as never}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Review evidence
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
