'use client';

import { useMemo, useState } from 'react';
import { Bot, Loader2, Play, Sparkles } from 'lucide-react';

import { ErrorState } from '@/components/layout/error-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useCreateAgentRun, useAgentRuns } from '@/hooks/queries/use-ai-command-center';
import { useAuth } from '@/hooks/use-auth';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';

const EXECUTION_AGENTS = [
  {
    code: 'commerce_health_agent',
    label: 'Commerce Health Agent',
    shortDescription: 'Store health, trust posture, and top operational concerns.',
  },
  {
    code: 'revenue_monitor_agent',
    label: 'Revenue Monitor Agent',
    shortDescription: 'Revenue movement, order change, and commercial follow-up.',
  },
  {
    code: 'customer_momentum_agent',
    label: 'Customer Momentum Agent',
    shortDescription: 'Customer slowdown, momentum, and retention follow-up.',
  },
  {
    code: 'integration_guard_agent',
    label: 'Integration Guard Agent',
    shortDescription: 'Store sync health, payments visibility, and integration recovery.',
  },
] as const;

export function AgentExecutionPanel({
  title = 'AI Agents',
  description = 'Run bounded agents, inspect the latest signal, and route only reviewed actions.',
}: {
  title?: string;
  description?: string;
}) {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const createRun = useCreateAgentRun();
  const canRunAgents = hasPermission(permissionLabels.agentRun);
  const executionOrganizationId = activeContext.selectedOrganizationId ?? user?.organizationId ?? undefined;
  const executionOrganizationName = activeContext.selectedOrganization?.name ??
    activeContext.organizations.find((organization) => organization.id === user?.organizationId)?.name ??
    'current tenant';
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const runs = useAgentRuns(
    executionOrganizationId
      ? {
          page: 1,
          limit: 8,
          organizationId: executionOrganizationId,
        }
      : undefined,
  );

  const recentRuns = useMemo(() => {
    const items = runs.data?.items ?? [];
    return items.filter((item) => {
      if (agentFilter && item.agentCode !== agentFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      return true;
    });
  }, [agentFilter, runs.data?.items, statusFilter]);

  const latestRunByAgent = useMemo(
    () =>
      new Map(
        (runs.data?.items ?? []).map((run) => [run.agentCode, run]),
      ),
    [runs.data?.items],
  );

  const handleRun = async (agentCode: string) => {
    if (!executionOrganizationId) return;
    await createRun.mutateAsync({
      agentCode,
      organizationId: executionOrganizationId,
      triggerType: 'MANUAL',
      inputContext: {
        activeScope:
          activeContext.selectedOrganizationId ? 'tenant' : 'multi-tenant-active',
        selectedArchetype: activeContext.selectedArchetype,
      },
    });
  };

  const handleRunAll = async () => {
    if (!executionOrganizationId) return;
    for (const agent of EXECUTION_AGENTS) {
      await handleRun(agent.code);
    }
  };

  return (
    <SectionCard
      eyebrow="Agent execution"
      title={title}
      description={description}
      actions={
        <Button
          onClick={handleRunAll}
          disabled={!executionOrganizationId || createRun.isPending || !canRunAgents}
          className="gap-2"
        >
          {createRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Run all agents
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <p>
            Execution scope: <span className="font-medium text-white">{executionOrganizationName}</span>
            {activeContext.selectedOrganizationId
              ? ' in tenant-scoped mode.'
              : ' while the dashboard remains in global management mode.'}
          </p>
          {!canRunAgents ? (
            <p className="mt-2 text-amber-100">
              Your current role can inspect AI outputs but cannot start new agent runs. Agent execution requires the
              intelligence execute permission.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {EXECUTION_AGENTS.map((agent) => {
            const latest = latestRunByAgent.get(agent.code);
            return (
              <div key={agent.code} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{agent.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{agent.shortDescription}</p>
                  </div>
                  <Bot className="h-5 w-5 text-[var(--brand-500)]" />
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last run</p>
                  <p className="mt-2 text-white">
                    {latest ? formatDateTime(latest.startedAt) : 'No recent run'}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {latest
                      ? `${latest.status} · ${latest.actionsProposed} proposal${latest.actionsProposed === 1 ? '' : 's'} captured in the most recent run.`
                      : 'Run this agent to create a new bounded review cycle.'}
                  </p>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => handleRun(agent.code)}
                    disabled={!executionOrganizationId || createRun.isPending || !canRunAgents}
                    className="w-full gap-2"
                  >
                    {createRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Run agent now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <Select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
            <option value="">All agents</option>
            {EXECUTION_AGENTS.map((agent) => (
              <option key={agent.code} value={agent.code}>
                {agent.label}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="SUCCEEDED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="WAITING_APPROVAL">Waiting approval</option>
            <option value="ACTED">Acted</option>
          </Select>
          <Button variant="ghost" onClick={() => { setAgentFilter(''); setStatusFilter(''); }}>
            Reset filters
          </Button>
        </div>

        {runs.isError ? (
          <ErrorState
            title="Unable to load recent agent runs."
            description="The command center could not refresh recent execution history."
            onRetry={() => runs.refetch()}
          />
        ) : (
          <div className="space-y-3">
            {recentRuns.slice(0, 6).map((run) => (
              <div key={run.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{run.agentName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {run.status} · {formatDateTime(run.startedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {run.actionsProposed} proposal{run.actionsProposed === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {run.targetEntityType
                    ? `Targeted ${run.targetEntityType} scope${run.targetEntityId ? ` (${run.targetEntityId})` : ''} with ${run.actionsProposed} proposal${run.actionsProposed === 1 ? '' : 's'} produced.`
                    : `Structured reasoning completed with ${run.actionsProposed} proposal${run.actionsProposed === 1 ? '' : 's'} available for review.`}
                </p>
              </div>
            ))}
            {recentRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                No recent runs match the current filter set.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
