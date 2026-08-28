'use client';

import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { formatDateTime } from '@/lib/utils';
import { ExecutiveSummaryData } from '@/types/executive';

export function ExecutiveSummaryCard({ summary }: { summary: ExecutiveSummaryData }) {
  return (
    <SectionCard
      eyebrow="Executive summary"
      title="Today’s leadership brief"
      description="Short leadership brief with evidence links."
      actions={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Trust score {summary.trustScore}/100
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(245,158,11,0.08))] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-500)]">
            <Sparkles className="h-4 w-4" />
            Today’s executive brief
          </div>
          <p className="mt-4 text-base leading-6 text-slate-100">{summary.todayBrief}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            Refreshed {formatDateTime(summary.generatedAt)}
          </p>
        </div>

        <SummaryList title="Top changes since yesterday" items={summary.topChanges} />
        <SummaryList title="Highest-risk operational issues" items={summary.highestRisks} />
        <SummaryList title="Recommended focus areas" items={summary.focusAreas} />

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Evidence links
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {summary.evidenceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as never}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        {items.slice(0, 3).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
