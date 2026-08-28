'use client';

import type { ComponentType } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Siren,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { DataTable } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAiOverview, useAgentRuns } from '@/hooks/queries/use-ai-command-center';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';

export function AiOverviewScreen() {
  const overview = useAiOverview();
  const runs = useAgentRuns({ page: 1, limit: 6 });

  if (overview.isLoading || runs.isLoading) {
    return (
      <LoadingState
        title="Loading AI Command Center..."
        description="Assembling live AI activity, governance, verification, and operational impact signals."
      />
    );
  }

  if (overview.isError || runs.isError || !overview.data) {
    return (
      <ErrorState
        title="Unable to load AI Command Center."
        description="One or more AI observability endpoints did not return successfully."
        onRetry={() => {
          overview.refetch();
          runs.refetch();
        }}
      />
    );
  }

  const recentRuns = runs.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Command Center"
        title="Control Tower"
        description="Supervise autonomous operations across reasoning, actions, approvals, verification, and governance from a single real-time command surface."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Agent runs today"
          value={overview.data.activity.agentRunsToday}
          description="Autonomous and operator-triggered runs completed across the organization today."
          icon={Sparkles}
        />
        <MetricCard
          title="Actions executed"
          value={overview.data.activity.actionsExecuted}
          description="Agent proposals that cleared governance and reached live actuation."
          icon={Zap}
        />
        <MetricCard
          title="Approvals required"
          value={overview.data.activity.approvalsRequired}
          description="High-risk proposals currently waiting for operator review."
          icon={Clock3}
        />
        <MetricCard
          title="Verification success"
          value={Math.round(overview.data.activity.verificationSuccessRate * 100)}
          description="Share of recent runs that verified intended technical and business outcomes."
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Operational impact"
          title="Measured AI contribution"
          description="Immediate impact signals captured from verification and governance telemetry."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <ImpactStat label="Incidents resolved" value={overview.data.impact.incidentsResolved} icon={Siren} />
            <ImpactStat label="Coverage improvement" value={overview.data.impact.scheduleCoverageImprovement} icon={Target} />
            <ImpactStat label="Asset readiness lift" value={overview.data.impact.assetReadinessImprovement} icon={Activity} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Agent health"
          title="Runtime posture"
          description="What operators should watch right now across model latency and run stability."
        >
          <div className="space-y-3 text-sm text-slate-300">
            <SummaryLine label="Active agents" value={overview.data.health.activeAgents} />
            <SummaryLine label="Failed runs" value={overview.data.health.failedRuns} />
            <SummaryLine label="Average latency" value={`${formatNumber(overview.data.health.averageLatencyMs)} ms`} />
            <SummaryLine label="Traceability" value="Structured decision + verification enabled" />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Recent runs"
          title="Live AI activity"
          description="Recent runs across the lifecycle from trigger through verification."
        >
          <DataTable
            data={recentRuns}
            rowKey={(row) => row.id}
            columns={[
              { key: 'agentName', title: 'Agent', render: (row) => row.agentName },
              { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
              { key: 'target', title: 'Target', render: (row) => row.targetEntityId ?? '-' },
              { key: 'startedAt', title: 'Started', render: (row) => formatDateTime(row.startedAt) },
            ]}
            rowActions={(row) => (
              <Link
                href={`/ai/runs/${row.id}` as Route}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Inspect
              </Link>
            )}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Recent decisions"
          title="Decision feed"
          description="Last recorded structured decisions for operator review and trust calibration."
        >
          <div className="space-y-3">
            {overview.data.recentDecisions.map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{decision.agentName}</p>
                  <StatusBadge value={decision.confidence} />
                </div>
                <p className="mt-2 text-sm text-slate-400">{decision.summary}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {formatDateTime(decision.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function ImpactStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.52))] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-[var(--brand-500)]" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{formatNumber(value)}</p>
    </div>
  );
}
