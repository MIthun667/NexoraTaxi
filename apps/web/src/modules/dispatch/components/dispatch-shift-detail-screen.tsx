'use client';

import Link from 'next/link';

import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDispatchShift, useDispatchZone } from '@/hooks/queries/use-dispatch-assignments';
import { formatDateTime } from '@/lib/utils';

export function DispatchShiftDetailScreen({ id }: { id: string }) {
  const shift = useDispatchShift(id);
  const zone = useDispatchZone(shift.data?.zoneId ?? undefined);
  if (shift.isLoading) return <LoadingState title="Loading operational shift..." description="Resolving shift metadata and operating window." />;
  if (shift.isError || !shift.data) return <ErrorState title="Unable to load operational shift." onRetry={() => shift.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operational shift" title={shift.data.title} description="Operational shift detail with zone linkage, supervisor reference, and operating window." actions={<Link href="/operations/shifts" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to shifts</Link>} /><EntityMetaGrid items={[
    { label: 'Shift code', value: shift.data.code },
    { label: 'Zone', value: zone.data?.name ?? shift.data.zoneId },
    { label: 'Status', value: shift.data.status },
    { label: 'Supervisor user', value: shift.data.supervisorUserId },
    { label: 'Starts at', value: formatDateTime(shift.data.startsAt) },
    { label: 'Ends at', value: formatDateTime(shift.data.endsAt) },
    { label: 'Description', value: shift.data.description },
  ]} /></div>;
}
