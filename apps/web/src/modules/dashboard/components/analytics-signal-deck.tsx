'use client';

import { Activity, Bot, BriefcaseBusiness, ClipboardCheck } from 'lucide-react';

import { TrendChartCard } from '@/components/charts/trend-chart-card';
import { SectionCard } from '@/components/layout/section-card';
import { SignalBarList } from '@/modules/dashboard/components/signal-bar-list';
import { formatNumber } from '@/lib/utils';
import { AiOverviewData } from '@/types/ai';
import { ApprovalsSummary, IncidentTrendData, WorkforceTrendData, DispatchTrendData } from '@/types/dashboard';

export function AnalyticsSignalDeck({
  archetypeLabel,
  workforceTrends,
  operationsTrends,
  incidentTrends,
  approvalsSummary,
  aiOverview,
  availableOperators,
  requiredCoverage,
}: {
  archetypeLabel: string;
  workforceTrends?: WorkforceTrendData | null;
  operationsTrends?: DispatchTrendData | null;
  incidentTrends?: IncidentTrendData | null;
  approvalsSummary?: ApprovalsSummary | null;
  aiOverview?: AiOverviewData | null;
  availableOperators: number;
  requiredCoverage: number;
}) {
  const coverageGap = Math.max(requiredCoverage - availableOperators, 0);
  const approvalSnapshot = (approvalsSummary?.byStatus ?? []).map((entry) => ({
    label: entry.status.replaceAll('_', ' '),
    value: entry.count,
    tone:
      entry.status === 'APPROVED'
        ? ('success' as const)
        : entry.status === 'REJECTED'
          ? ('danger' as const)
          : ('info' as const),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        eyebrow="Approval flow"
        title="Approval queue snapshot"
        description="Pending, active, and delayed approvals in the current operating window."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <SignalBarList
            items={approvalSnapshot}
            emptyMessage="No approval activity detected in the current window."
          />
          <CompactMetrics
            items={[
              {
                icon: ClipboardCheck,
                label: 'Pending',
                value: formatNumber(approvalsSummary?.totals.pendingApprovalRequests ?? 0),
              },
              {
                icon: ClipboardCheck,
                label: 'Overdue',
                value:
                  approvalsSummary?.totals.overdueApprovalSteps
                    ? formatNumber(approvalsSummary.totals.overdueApprovalSteps)
                    : 'Stable',
              },
              {
                icon: ClipboardCheck,
                label: 'Assigned to me',
                value:
                  approvalsSummary?.totals.approvalsAssignedToCurrentUser
                    ? formatNumber(approvalsSummary.totals.approvalsAssignedToCurrentUser)
                    : 'Clear',
              },
            ]}
          />
        </div>
      </SectionCard>

      <TrendChartCard
        eyebrow="Workforce / hiring"
        title={`${archetypeLabel} capacity`}
        description={
          coverageGap > 0
            ? `${formatNumber(coverageGap)} role${coverageGap === 1 ? '' : 's'} below live coverage need.`
            : 'Capacity is currently covering live demand.'
        }
        data={toTrendSeries(workforceTrends?.hires ?? [])}
        dataKey="count"
        color="#38bdf8"
      />

      <TrendChartCard
        eyebrow="Operations load"
        title="Assignment and run volume"
        description={
          (operationsTrends?.assignmentsCreated ?? []).length
            ? 'Live execution flow across assignment and work order intake.'
            : 'Verified assignment telemetry is currently unavailable for the selected period.'
        }
        data={toTrendSeries(operationsTrends?.assignmentsCreated ?? [])}
        dataKey="count"
        color="#f59e0b"
      />

      <SectionCard
        eyebrow="AI activity"
        title="Agent run and action posture"
        description="Bounded AI activity, approvals, and recent decision flow."
      >
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <CompactMetrics
            items={[
              {
                icon: Bot,
                label: 'Runs today',
                value: aiOverview?.activity.agentRunsToday
                  ? formatNumber(aiOverview.activity.agentRunsToday)
                  : 'Idle',
              },
              {
                icon: Activity,
                label: 'Actions',
                value: aiOverview?.activity.actionsExecuted
                  ? formatNumber(aiOverview.activity.actionsExecuted)
                  : 'None',
              },
              {
                icon: BriefcaseBusiness,
                label: 'Approvals',
                value: aiOverview?.activity.approvalsRequired
                  ? formatNumber(aiOverview.activity.approvalsRequired)
                  : 'Clear',
              },
            ]}
          />
          <div className="space-y-3">
            {aiOverview?.recentDecisions?.length ? (
              aiOverview.recentDecisions.slice(0, 3).map((decision) => (
                <div
                  key={decision.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-sm font-medium text-white">{decision.agentName}</p>
                  <p className="mt-1 text-sm text-slate-400">{decision.summary}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                No recent AI activity in this window. The runtime is available, but no agent runs have produced decisions recently.
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function CompactMetrics({
  items,
}: {
  items: Array<{ icon: typeof ClipboardCheck; label: string; value: string }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <Icon className="h-4 w-4 text-[var(--brand-500)]" />
            </div>
            <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function toTrendSeries(points: Array<{ date: string; count: number }>) {
  if (!points.length) {
    return [];
  }

  return points.map((point) => ({
    label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: point.count,
  }));
}
