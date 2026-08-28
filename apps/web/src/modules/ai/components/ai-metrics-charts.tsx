'use client';

import { SectionCard } from '@/components/layout/section-card';
import { AiMetricsData } from '@/types/ai';
import { formatNumber } from '@/lib/utils';

const palette = {
  sky: 'bg-sky-400/80',
  amber: 'bg-amber-400/80',
  emerald: 'bg-emerald-400/80',
  rose: 'bg-rose-400/80',
} as const;

export function AiMetricsCharts({ metrics }: { metrics: AiMetricsData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <MetricTrendCard
        eyebrow="Success rate"
        title="Agent success trend"
        description="Share of runs ending in successful or partially successful verified states."
        series={metrics.successTrend}
        colorClass={palette.sky}
      />
      <MetricTrendCard
        eyebrow="Approvals"
        title="Approval acceptance trend"
        description="Approval acceptance and queue posture across AI action proposals."
        series={metrics.approvalTrend}
        colorClass={palette.amber}
      />
      <MetricTrendCard
        eyebrow="Latency"
        title="Action execution latency"
        description="End-to-end agent actuation latency across recent runs."
        series={metrics.latencyTrend}
        colorClass={palette.emerald}
        suffix=" ms"
      />
      <MetricTrendCard
        eyebrow="Governance"
        title="Policy violation trend"
        description="Blocked actions and governance exceptions across recent execution windows."
        series={metrics.violationTrend}
        colorClass={palette.rose}
      />
    </div>
  );
}

function MetricTrendCard({
  eyebrow,
  title,
  description,
  series,
  colorClass,
  suffix = '',
}: {
  eyebrow: string;
  title: string;
  description: string;
  series: AiMetricsData['successTrend'];
  colorClass: string;
  suffix?: string;
}) {
  const max = Math.max(...series.map((point) => point.count), 1);

  return (
    <SectionCard eyebrow={eyebrow} title={title} description={description}>
      <div className="space-y-4">
        {series.map((point) => {
          const width = Math.max((point.count / max) * 100, 8);

          return (
            <div key={point.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">{point.label}</span>
                <span className="text-slate-400">
                  {formatNumber(point.count)}
                  {suffix}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div
                  className={`h-2 rounded-full transition-all ${colorClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
