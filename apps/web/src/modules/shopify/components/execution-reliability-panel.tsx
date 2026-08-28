'use client';

import { SectionCard } from '@/components/layout/section-card';
import { OutcomeAnalyticsResponse } from '@/types/shopify-intelligence';

export function ExecutionReliabilityPanel({
  analytics,
}: {
  analytics: OutcomeAnalyticsResponse;
}) {
  return (
    <SectionCard
      title="Execution Reliability"
      description="Whether approved Nexora actions are completing reliably and where follow-up tends to concentrate."
      variant="subtle"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <ExecutionStat label="Completed" value={String(analytics.executionReliability.completed)} />
          <ExecutionStat label="Failed" value={String(analytics.executionReliability.failed)} />
          <ExecutionStat label="Pending approval" value={String(analytics.executionReliability.approvalPending)} />
        </div>

        {analytics.executionReliability.failureByType.length === 0 ? (
          <p className="text-sm text-slate-400">No execution failures were recorded in the current lookback window.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Failure concentration</p>
            <ul className="space-y-2 text-sm text-slate-300">
              {analytics.executionReliability.failureByType.map((item) => (
                <li key={item.type} className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                  <span>{humanize(item.type)}</span>
                  <span className="text-slate-500">{item.failedCount} failed / {item.total} total</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ExecutionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
