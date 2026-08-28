'use client';

import {
  Gauge,
  ShieldAlert,
  Sparkles,
  TimerReset,
} from 'lucide-react';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { MetricCard } from '@/modules/shared/components/metric-card';
import { useAiMetrics } from '@/hooks/queries/use-ai-command-center';

import { AiMetricsCharts } from './ai-metrics-charts';

export function AiMetricsScreen() {
  const metrics = useAiMetrics();

  if (metrics.isLoading) {
    return (
      <LoadingState
        title="Loading AI metrics..."
        description="Calculating runtime health, approval posture, latency, and policy trend telemetry."
      />
    );
  }

  if (metrics.isError || !metrics.data) {
    return <ErrorState title="Unable to load AI metrics." onRetry={() => metrics.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI metrics"
        title="Performance & Governance Metrics"
        description="Track success rate, approval acceptance, execution latency, and governance pressure across autonomous operations."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Success rate"
          value={Math.round(metrics.data.successRate * 100)}
          description="Runs ending in successful or partially successful verified outcomes."
          icon={Sparkles}
        />
        <MetricCard
          title="Approval acceptance"
          value={Math.round(metrics.data.approvalAcceptanceRate * 100)}
          description="Share of AI proposals accepted by human reviewers."
          icon={Gauge}
        />
        <MetricCard
          title="Execution latency"
          value={Math.round(metrics.data.averageExecutionLatencyMs)}
          description="Average time from action dispatch to completion."
          icon={TimerReset}
        />
        <MetricCard
          title="Violation rate"
          value={Math.round(metrics.data.policyViolationRate * 100)}
          description="Relative pressure from policy blocks, overrides, and governance failures."
          icon={ShieldAlert}
        />
      </div>

      <AiMetricsCharts metrics={metrics.data} />
    </div>
  );
}
