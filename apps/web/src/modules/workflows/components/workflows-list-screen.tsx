'use client';

import Link from 'next/link';

import { DetailSection } from '@/components/layout/detail-section';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { useWorkflowDefinitions, useWorkflowTasks } from '@/hooks/queries/use-workflows';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { formatDateTime, formatNumber } from '@/lib/utils';

export function WorkflowsListScreen() {
  const { query, updateQuery } = useListQueryState();
  const tasks = useWorkflowTasks({ page: query.page, limit: query.limit, status: query.status || undefined });
  const definitions = useWorkflowDefinitions({ page: 1, limit: 6 });
  const items = tasks.data?.items ?? [];
  if (tasks.isLoading) return <LoadingState title="Loading workflow monitor..." description="Fetching assigned workflow tasks and active definition catalog." />;
  if (tasks.isError) return <ErrorState title="Unable to load workflow monitor." onRetry={() => tasks.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Workflows" title="Workflow Monitor" description="Operational process monitor for assigned tasks, instance context, and active workflow templates." />
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      {items.length === 0 ? <EmptyState title="No workflow tasks assigned" description="There are no workflow tasks currently assigned to the active principal." /> : <DataTable data={items} rowKey={(row) => row.id} meta={tasks.data?.meta} columns={[
        { key: 'taskKey', title: 'Task', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.taskKey}</p></div> },
        { key: 'instance', title: 'Workflow', render: (row) => row.instance.definition.name },
        { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
        { key: 'dueAt', title: 'Due', render: (row) => row.dueAt ? formatDateTime(row.dueAt) : '-' },
      ]} rowActions={(row) => <Link href={`/workflows/${row.instance.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open workflow</Link>} />}
      <DetailSection title="Active workflow definitions" description="Template catalog currently available to the platform.">
        <div className="space-y-3">
          {(definitions.data?.items ?? []).map((definition) => <div key={definition.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-white">{definition.name}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{definition.code}</p></div><StatusBadge value={definition.isActive ? 'ACTIVE' : 'INACTIVE'} /></div><p className="mt-2 text-sm text-slate-400">{definition.moduleKey}</p></div>)}
        </div>
      </DetailSection>
    </div>
    {tasks.data?.meta ? <div className="flex justify-end"><PaginationControls meta={tasks.data.meta} onPageChange={(page) => updateQuery({ page })} /></div> : null}
  </div>;
}
