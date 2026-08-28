'use client';

import { SectionCard } from '@/components/layout/section-card';
import { PortfolioExecutiveResponse } from '@/types/shopify-intelligence';

export function PortfolioSummaryPanel({
  summary,
  limitations,
}: {
  summary: PortfolioExecutiveResponse['portfolioSummary'];
  limitations: string[];
}) {
  return (
    <SectionCard
      title="Portfolio Summary"
      description="A concise leadership view of cross-organization trust, action backlog, and recent outcome quality."
    >
      <div className="space-y-4">
        <p className="max-w-3xl text-[15px] font-medium leading-relaxed text-slate-200">
          {summary.summary}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryStat label="Organizations in scope" value={String(summary.totalOrganizations)} />
          <SummaryStat
            label="Need attention"
            value={String(summary.organizationsNeedingAttention)}
          />
          <SummaryStat
            label="Mode"
            value={summary.singleOrganizationMode ? 'Single org' : 'Portfolio'}
          />
        </div>
        {limitations.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-400">
            {limitations.slice(0, 3).map((item, index) => (
              <li key={`portfolio-limitation-${index}-${item}`} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionCard>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}
