'use client';

import Link from 'next/link';

import { AssignmentSummaryCard } from '@/components/layout/assignment-summary-card';
import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDispatchAssignment, useDispatchShift, useDispatchZone } from '@/hooks/queries/use-dispatch-assignments';
import { useDriver } from '@/hooks/queries/use-drivers';
import { useFleetVehicle } from '@/hooks/queries/use-fleet-vehicles';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';
import { ReleaseAssignmentPanel } from '@/modules/dispatch/components/release-assignment-panel';

export function DispatchAssignmentDetailScreen({ id }: { id: string }) {
  const assignment = useDispatchAssignment(id);
  const driver = useDriver(assignment.data?.driverId);
  const vehicle = useFleetVehicle(assignment.data?.vehicleId);
  const zone = useDispatchZone(assignment.data?.zoneId ?? undefined);
  const shift = useDispatchShift(assignment.data?.shiftId ?? undefined);
  if (assignment.isLoading) return <LoadingState title="Loading resource assignment..." description="Resolving assignment pairing and linked operating context." />;
  if (assignment.isError || !assignment.data) return <ErrorState title="Unable to load resource assignment." onRetry={() => assignment.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Resource assignment" title={`Assignment ${assignment.data.id.slice(0,8)}`} description="Operator-to-asset assignment record with zone, shift, and release control." actions={<Link href="/operations/assignments" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to assignments</Link>} />
    <div className="flex items-center gap-3"><StatusBadge value={assignment.data.assignmentStatus} /></div>
    <AssignmentSummaryCard driver={driver.data ? `${driver.data.firstName} ${driver.data.lastName}` : assignment.data.driverId} vehicle={vehicle.data ? `${vehicle.data.make} ${vehicle.data.model}` : assignment.data.vehicleId} zone={zone.data?.name ?? assignment.data.zoneId} shift={shift.data?.title ?? assignment.data.shiftId} />
    <EntityMetaGrid items={[
      { label: 'Operator ID', value: assignment.data.driverId },
      { label: 'Asset ID', value: assignment.data.vehicleId },
      { label: 'Zone ID', value: assignment.data.zoneId },
      { label: 'Shift ID', value: assignment.data.shiftId },
      { label: 'Assigned at', value: formatDateTime(assignment.data.assignedAt) },
      { label: 'Released at', value: assignment.data.releasedAt ? formatDateTime(assignment.data.releasedAt) : null },
      { label: 'Assigned by user', value: assignment.data.assignedByUserId },
      { label: 'Notes', value: assignment.data.notes },
    ]} />
    <PermissionGate permission={permissionLabels.operationsAssignmentManage}><ReleaseAssignmentPanel assignmentId={id} /></PermissionGate>
  </div>;
}
