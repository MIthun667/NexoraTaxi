'use client';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { useExecutiveReport } from '@/hooks/queries/use-executive';
import { formatDateTime } from '@/lib/utils';

export function ExecutiveReportScreen({ id }: { id: string }) {
  const report = useExecutiveReport(id);

  if (report.isLoading) {
    return (
      <LoadingState
        title="Loading executive report..."
        description="Retrieving the structured memo, supporting facts, and evidence-backed summary."
      />
    );
  }

  if (report.isError || !report.data) {
    return (
      <ErrorState
        title="Unable to load executive report."
        description="The requested leadership memo could not be assembled."
        onRetry={() => report.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive report"
        title={report.data.title}
        description={`${report.data.summary} Generated ${formatDateTime(report.data.generatedAt)}.`}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          eyebrow="Decision memo"
          title="Structured narrative"
          description="Leadership-ready memo designed for fast scan and evidence-backed review."
        >
          <div className="space-y-5">
            {report.data.sections.map((section) => (
              <div key={section.heading} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {section.heading}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-300">{section.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Supporting facts"
          title="Evidence snapshot"
          description="Compact supporting evidence surfaced alongside the memo."
        >
          <div className="space-y-3">
            {report.data.supportingFacts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">{fact.label}</span>
                  <span className="text-sm font-semibold text-white">{fact.value}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
