'use client';

import Link from 'next/link';

import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { DetailSection } from '@/components/layout/detail-section';
import { useDispatchAssignments, useDispatchShifts, useDispatchZone } from '@/hooks/queries/use-dispatch-assignments';
import { formatDateTime, formatNumber } from '@/lib/utils';

export function DispatchZoneDetailScreen({ id }: { id: string }) {
  const zone = useDispatchZone(id);
  const shifts = useDispatchShifts({ page: 1, limit: 5, zoneId: id });
  const assignments = useDispatchAssignments({ page: 1, limit: 5, zoneId: id });

  if (zone.isLoading) return <LoadingState title="Loading operational zone..." description="Resolving zone profile and linked operational load." />;
  if (zone.isError || !zone.data) return <ErrorState title="Unable to load operational zone." onRetry={() => zone.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operational zone" title={zone.data.name} description="Operational zone profile used for operations control and shift coordination." actions={<Link href="/operations/zones" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to zones</Link>} />
      <EntityMetaGrid items={[
        { label: 'Zone code', value: zone.data.code },
        { label: 'Description', value: zone.data.description },
        { label: 'Activity', value: zone.data.isActive ? 'Active' : 'Inactive' },
        { label: 'Created', value: formatDateTime(zone.data.createdAt) },
        { label: 'Updated', value: formatDateTime(zone.data.updatedAt) },
      ]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Shift load" description="Recent shifts linked to this zone.">
          <div className="space-y-3 text-sm text-slate-300">
            <p>Visible shifts: <span className="text-white">{formatNumber(shifts.data?.meta?.total ?? 0)}</span></p>
            {(shifts.data?.items ?? []).slice(0, 5).map((shift) => <div key={shift.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="font-medium text-white">{shift.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{shift.code}</p></div>)}
          </div>
        </DetailSection>
        <DetailSection title="Assignment load" description="Recent assignments scoped to this zone.">
          <div className="space-y-3 text-sm text-slate-300">
            <p>Visible assignments: <span className="text-white">{formatNumber(assignments.data?.meta?.total ?? 0)}</span></p>
            {(assignments.data?.items ?? []).slice(0, 5).map((assignment) => <div key={assignment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="font-medium text-white">{assignment.id.slice(0, 8)}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{assignment.assignmentStatus}</p></div>)}
          </div>
        </DetailSection>
      </div>
    </div>
  );
}
