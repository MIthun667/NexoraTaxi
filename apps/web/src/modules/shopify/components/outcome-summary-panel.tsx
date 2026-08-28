'use client';

import { SectionCard } from '@/components/layout/section-card';
import { OutcomeAnalyticsResponse } from '@/types/shopify-intelligence';

export function OutcomeSummaryPanel({
  analytics,
}: {
  analytics: OutcomeAnalyticsResponse;
}) {
  return (
    <SectionCard
      title="Outcome Summary"
      description="How reviewed actions and outcomes are trending across the current lookback window."
    >
      <div className="space-y-5">
        <p className="max-w-3xl text-sm leading-6 text-slate-200">{analytics.summary}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OutcomeStat label="Actions executed" value={String(analytics.actionVolume.actionsExecuted)} />
          <OutcomeStat label="Positive outcomes" value={formatPercent(analytics.outcomeSummary.positiveOutcomeRate)} />
          <OutcomeStat label="Approvals" value={formatPercent(analytics.proposalReviewPatterns.approvalRate)} />
          <OutcomeStat label="Execution success" value={formatPercent(analytics.executionReliability.successRate)} />
        </div>
      </div>
    </SectionCard>
  );
}

function OutcomeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
