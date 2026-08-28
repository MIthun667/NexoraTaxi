'use client';

import { Bot, CheckCircle2, Clock3, Sparkles } from 'lucide-react';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { Select } from '@/components/ui/select';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useAgentRuns } from '@/hooks/queries/use-ai-command-center';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { MetricCard } from '@/modules/shared/components/metric-card';

import { AgentRunTable } from './agent-run-table';

export function AgentRunsScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState(12);
  const activeContext = useDemoContext();
  const runs = useAgentRuns({
    page: query.page,
    limit: 50,
    search: query.search || undefined,
    status: query.status || undefined,
    organizationId: activeContext.selectedOrganizationId || undefined,
    agentCode: query.agentCode || undefined,
  });

  if (runs.isLoading) {
    return (
      <LoadingState
        title="Loading agent runs..."
        description="Fetching recent commerce agent activity, statuses, and review items."
      />
    );
  }

  if (runs.isError) {
    return <ErrorState title="Unable to load agent runs." onRetry={() => runs.refetch()} />;
  }

  const dateFilter = query.severity || '';
  const filteredRuns = (runs.data?.items ?? []).filter((item) => {
    if (!dateFilter) return true;
    const startedAt = new Date(item.startedAt).getTime();
    const now = Date.now();
    const diff = now - startedAt;
    if (dateFilter === '24h') return diff <= 24 * 60 * 60 * 1000;
    if (dateFilter === '7d') return diff <= 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === '30d') return diff <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const completedRuns = filteredRuns.filter((item) => item.status.includes('SUCCESS')).length;
  const waitingApproval = filteredRuns.filter((item) => item.status === 'WAITING_APPROVAL').length;
  const totalActions = filteredRuns.reduce((sum, item) => sum + item.actionsProposed, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Runs in view" value={filteredRuns.length} description="Recent commerce agent runs visible in the current scope." icon={Bot} />
        <MetricCard title="Successful runs" value={completedRuns} description="Runs that completed successfully in the current window." icon={CheckCircle2} />
        <MetricCard title="Needs review" value={waitingApproval} description="Runs with proposals still waiting for human review." icon={Clock3} />
        <MetricCard title="Follow-up proposals" value={totalActions} description="Bounded proposals generated across the visible run set." icon={Sparkles} />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by agent, run id, or target entity"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        onReset={() => resetQuery(['search', 'page', 'status', 'agentCode', 'severity'])}
        filters={
          <>
            <Select
              value={query.agentCode}
              onChange={(event) => updateQuery({ agentCode: event.target.value, page: 1 })}
              className="w-[220px]"
            >
              <option value="">All agents</option>
              <option value="commerce_health_agent">Commerce Health Agent</option>
              <option value="revenue_monitor_agent">Revenue Monitor Agent</option>
              <option value="customer_momentum_agent">Customer Momentum Agent</option>
              <option value="integration_guard_agent">Integration Guard Agent</option>
            </Select>
            <Select
              value={query.status}
              onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
              className="w-[220px]"
            >
              <option value="">All statuses</option>
              <option value="RUNNING">Running</option>
              <option value="WAITING_APPROVAL">Waiting approval</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
            </Select>
            <Select
              value={dateFilter}
              onChange={(event) => updateQuery({ severity: event.target.value, page: 1 })}
              className="w-[180px]"
            >
              <option value="">All dates</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </Select>
          </>
        }
      />

      {filteredRuns.length ? (
        <AgentRunTable items={filteredRuns.slice(0, query.limit)} meta={runs.data?.meta} />
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
          No commerce agent runs match the current filters.
        </div>
      )}
    </div>
  );
}
