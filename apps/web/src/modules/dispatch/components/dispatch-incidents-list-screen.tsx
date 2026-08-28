'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/use-auth';
import { useDispatchIncidents } from '@/hooks/queries/use-dispatch-assignments';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { DispatchIncidentForm } from '@/modules/dispatch/components/dispatch-incident-form';

export function DispatchIncidentsListScreen() {
  const { user } = useAuth();
  const { query, updateQuery, resetQuery } = useListQueryState();
  const incidents = useDispatchIncidents({ page: query.page, limit: query.limit, search: query.search || undefined, organizationId: query.organizationId || user?.organizationId || undefined, runId: query.runId || undefined, assignmentId: query.assignmentId || undefined, incidentType: query.incidentType || undefined, severity: query.severity || undefined, status: query.status || undefined });
  const items = incidents.data?.items ?? [];
  if (incidents.isLoading) return <LoadingState title="Loading operational issues..." description="Fetching current incident queue, severity posture, and linked operational context." />;
  if (incidents.isError) return <ErrorState title="Unable to load operational issues." onRetry={() => incidents.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operations" title="Operational Issues" description="Issue control surface for route disruption, safety events, and operational exceptions." actions={<PermissionGate permission={permissionLabels.operationsIssueManage}><Button variant="outline">Create issue</Button></PermissionGate>} />
    <PermissionGate permission={permissionLabels.operationsIssueManage}><DispatchIncidentForm organizationId={user?.organizationId} initialValues={{ reportedByUserId: user?.id }} /></PermissionGate>
    <TableToolbar searchValue={query.search} searchPlaceholder="Search by issue code or title" onSearchChange={(value) => updateQuery({ search: value, page: 1 })} onReset={() => resetQuery(['search','page','status','severity','incidentType','assignmentId'])} />
    {items.length === 0 ? <EmptyState title="No operational issues found" description="There are no operational issues matching the current filters." /> : <>
      <DataTable data={items} rowKey={(row) => row.id} meta={incidents.data?.meta} columns={[
        { key: 'incidentCode', title: 'Issue', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.incidentCode}</p></div> },
        { key: 'incidentType', title: 'Type', render: (row) => row.incidentType.replaceAll('_',' ') },
        { key: 'severity', title: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
        { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
        { key: 'reportedAt', title: 'Reported', render: (row) => formatDateTime(row.reportedAt) },
      ]} rowActions={(row) => <Link href={`/operations/incidents/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open issue</Link>} />
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(incidents.data?.meta?.total ?? items.length)} operational issues</p><PaginationControls meta={incidents.data?.meta} onPageChange={(page) => updateQuery({ page })} /></div>
    </>}</div>;
}
