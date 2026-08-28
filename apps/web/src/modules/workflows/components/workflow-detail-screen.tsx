'use client';

import Link from 'next/link';

import { DetailSection } from '@/components/layout/detail-section';
import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { TimelineCard } from '@/components/layout/timeline-card';
import { PermissionGate } from '@/components/layout/permission-gate';
import { StatusBadge } from '@/components/ui/status-badge';
import { useWorkflowInstance, useWorkflowTask } from '@/hooks/queries/use-workflows';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';
import { WorkflowTaskPanel } from '@/modules/workflows/components/workflow-task-panel';

export function WorkflowDetailScreen({ id }: { id: string }) {
  const instance = useWorkflowInstance(id);
  const activeTaskId = instance.data?.tasks.find((task) => ['PENDING', 'IN_PROGRESS', 'ESCALATED'].includes(task.status))?.id;
  const activeTask = useWorkflowTask(activeTaskId);
  if (instance.isLoading) return <LoadingState title="Loading workflow instance..." description="Resolving workflow instance metadata, task chain, and action history." />;
  if (instance.isError || !instance.data) return <ErrorState title="Unable to load workflow instance." onRetry={() => instance.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Workflow instance" title={instance.data.definition.name} description="Operational workflow monitor for process state, task progression, and execution actions." actions={<Link href="/workflows" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to workflows</Link>} />
    <div className="flex items-center gap-3"><StatusBadge value={instance.data.status} /></div>
    <EntityMetaGrid items={[
      { label: 'Definition code', value: instance.data.definition.code },
      { label: 'Module key', value: instance.data.definition.moduleKey },
      { label: 'Entity type', value: instance.data.entityType },
      { label: 'Entity ID', value: instance.data.entityId },
      { label: 'Started', value: formatDateTime(instance.data.startedAt) },
      { label: 'Completed', value: instance.data.completedAt ? formatDateTime(instance.data.completedAt) : null },
      { label: 'Cancelled', value: instance.data.cancelledAt ? formatDateTime(instance.data.cancelledAt) : null },
    ]} />
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <DetailSection title="Workflow tasks" description="Task progression and current task ownership across this workflow instance.">
          <div className="space-y-3">
            {instance.data.tasks.map((task) => <div key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-white">{task.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{task.taskKey}</p></div><StatusBadge value={task.status} /></div><p className="mt-2 text-sm text-slate-400">{task.description ?? 'No task description provided.'}</p></div>)}
          </div>
        </DetailSection>
        <TimelineCard title="Active task actions" description="Action audit trail for the current actionable workflow task." items={(activeTask.data?.actions ?? []).map((action) => ({ id: action.id, title: action.actionLabel, description: action.comment, timestamp: formatDateTime(action.createdAt) }))} />
      </div>
      <div className="space-y-4">
        {activeTaskId ? <PermissionGate permission={permissionLabels.workflowAct}><WorkflowTaskPanel taskId={activeTaskId} /></PermissionGate> : null}
      </div>
    </div>
  </div>;
}
