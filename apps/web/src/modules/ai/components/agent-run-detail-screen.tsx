'use client';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { TimelineCard } from '@/components/layout/timeline-card';
import { useAgentRun } from '@/hooks/queries/use-ai-command-center';
import { formatDateTime } from '@/lib/utils';
import { AgentRunTraceItem } from '@/types/ai';

import { DecisionViewer } from './decision-viewer';

export function AgentRunDetailScreen({ id }: { id: string }) {
  const run = useAgentRun(id);

  if (run.isLoading) {
    return (
      <LoadingState
        title="Loading agent run..."
        description="Assembling the run summary, observations, proposals, and evidence."
      />
    );
  }

  if (run.isError || !run.data) {
    return <ErrorState title="Unable to load the selected agent run." onRetry={() => run.refetch()} />;
  }

  const traceItems = (run.data.trace as AgentRunTraceItem[]).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    timestamp: formatDateTime(item.timestamp),
  }));

  return (
    <div className="space-y-6">
      <DecisionViewer run={run.data} />

      <TimelineCard
        title="Execution trace"
        description="Ordered lifecycle trace for this agent run."
        items={traceItems}
      />
    </div>
  );
}
