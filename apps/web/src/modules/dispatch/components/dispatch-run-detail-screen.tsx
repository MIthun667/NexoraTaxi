'use client';

import Link from 'next/link';

import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDispatchAssignment, useDispatchRun, useDispatchZone } from '@/hooks/queries/use-dispatch-assignments';
import { formatDateTime } from '@/lib/utils';

export function DispatchRunDetailScreen({ id }: { id: string }) {
  const run = useDispatchRun(id);
  const assignment = useDispatchAssignment(run.data?.assignmentId);
  const zone = useDispatchZone(run.data?.zoneId ?? assignment.data?.zoneId ?? undefined);
  if (run.isLoading) return <LoadingState title="Loading work order..." description="Resolving run lifecycle state and linked assignment context." />;
  if (run.isError || !run.data) return <ErrorState title="Unable to load operational run." onRetry={() => run.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Work order" title={run.data.workOrderId} description="Work order lifecycle with assignment and zone linkage." actions={<Link href="/operations/runs" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to work orders</Link>} />
    <div className="flex items-center gap-3"><StatusBadge value={run.data.dispatchStatus} /></div>
    <EntityMetaGrid items={[
      { label: 'Assignment', value: assignment.data?.id ?? run.data.assignmentId, href: assignment.data ? `/operations/assignments/${assignment.data.id}` : undefined },
      { label: 'Zone', value: zone.data?.name ?? run.data.zoneId },
      { label: 'Started', value: run.data.startedAt ? formatDateTime(run.data.startedAt) : null },
      { label: 'Completed', value: run.data.completedAt ? formatDateTime(run.data.completedAt) : null },
      { label: 'Cancelled', value: run.data.cancelledAt ? formatDateTime(run.data.cancelledAt) : null },
      { label: 'Created', value: formatDateTime(run.data.createdAt) },
    ]} />
  </div>;
}
