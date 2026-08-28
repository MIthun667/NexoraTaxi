'use client';

import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDispatchAssignments } from '@/hooks/queries/use-dispatch-assignments';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { CreateDispatchAssignmentForm } from '@/modules/dispatch/components/create-dispatch-assignment-form';

export function DispatchAssignmentsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const assignments = useDispatchAssignments({ page: query.page, limit: query.limit, search: query.search || undefined, organizationId: query.organizationId || undefined, driverId: query.driverId || undefined, vehicleId: query.vehicleId || undefined, zoneId: query.zoneId || undefined, shiftId: query.shiftId || undefined, assignmentStatus: query.assignmentStatus || undefined });
  const items = assignments.data?.items ?? [];
  const organizationId = items[0]?.organizationId;
  if (assignments.isLoading) return <LoadingState title="Loading resource assignments..." description="Fetching live operator-asset pairings and operational placement state." />;
  if (assignments.isError) return <ErrorState title="Unable to load resource assignments." onRetry={() => assignments.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operations" title="Resource Assignments" description="Live assignment control across operators, assets, shifts, and zones." actions={<PermissionGate permission={permissionLabels.operationsAssignmentManage}><Button variant="outline" disabled={!organizationId}>Create assignment</Button></PermissionGate>} />
    <PermissionGate permission={permissionLabels.operationsAssignmentManage}><CreateDispatchAssignmentForm organizationId={organizationId} /></PermissionGate>
    <TableToolbar searchValue={query.search} searchPlaceholder="Search assignments by notes or linked IDs" onSearchChange={(value) => updateQuery({ search: value, page: 1 })} onReset={() => resetQuery(['search','page','assignmentStatus','driverId','vehicleId','zoneId','shiftId'])} />
    {items.length === 0 ? <EmptyState title="No resource assignments found" description="No active or historical assignments matched the current query." /> : <>
      <DataTable data={items} rowKey={(row) => row.id} meta={assignments.data?.meta} columns={[
        { key: 'id', title: 'Assignment', render: (row) => row.id.slice(0,8) },
        { key: 'driverId', title: 'Operator Ref', render: (row) => row.driverId ?? '-' },
        { key: 'vehicleId', title: 'Asset Ref', render: (row) => row.vehicleId ?? '-' },
        { key: 'assignmentStatus', title: 'Status', render: (row) => <StatusBadge value={row.assignmentStatus} /> },
        { key: 'assignedAt', title: 'Assigned', render: (row) => formatDateTime(row.assignedAt) },
        { key: 'releasedAt', title: 'Released', render: (row) => row.releasedAt ? formatDateTime(row.releasedAt) : '-' },
      ]} rowActions={(row) => <Link href={`/operations/assignments/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open assignment</Link>} />
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(assignments.data?.meta?.total ?? items.length)} assignments</p><PaginationControls meta={assignments.data?.meta} onPageChange={(page) => updateQuery({ page })} /></div>
    </>}</div>;
}
