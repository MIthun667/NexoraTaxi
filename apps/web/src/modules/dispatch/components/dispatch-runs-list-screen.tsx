'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDispatchRuns } from '@/hooks/queries/use-dispatch-assignments';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { formatDateTime, formatNumber } from '@/lib/utils';

export function DispatchRunsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const runs = useDispatchRuns({ page: query.page, limit: query.limit, search: query.search || undefined, organizationId: query.organizationId || undefined, zoneId: query.zoneId || undefined, assignmentId: query.assignmentId || undefined, dispatchStatus: query.dispatchStatus || undefined });
  const items = runs.data?.items ?? [];
  if (runs.isLoading) return <LoadingState title="Loading work orders..." description="Fetching run execution records and live operations status." />;
  if (runs.isError) return <ErrorState title="Unable to load operational runs." onRetry={() => runs.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operations" title="Work Orders" description="Work order records linked to active assignments and zone control." />
    <TableToolbar searchValue={query.search} searchPlaceholder="Search by work order ID" onSearchChange={(value) => updateQuery({ search: value, page: 1 })} onReset={() => resetQuery(['search','page','zoneId','assignmentId','dispatchStatus'])} />
    {items.length === 0 ? <EmptyState title="No runs found" description="There are no operational runs matching the current filters." /> : <>
      <DataTable data={items} rowKey={(row) => row.id} meta={runs.data?.meta} columns={[
        { key: 'workOrderId', title: "Work Order ID", sortable: true },
        { key: 'assignmentId', title: 'Assignment Ref', render: (row) => row.assignmentId },
        { key: 'zoneId', title: 'Zone Ref', render: (row) => row.zoneId ?? '-' },
        { key: 'dispatchStatus', title: 'Status', render: (row) => <StatusBadge value={row.dispatchStatus} /> },
        { key: 'startedAt', title: 'Started', render: (row) => row.startedAt ? formatDateTime(row.startedAt) : '-' },
      ]} rowActions={(row) => <Link href={`/operations/runs/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open run</Link>} />
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(runs.data?.meta?.total ?? items.length)} runs</p><PaginationControls meta={runs.data?.meta} onPageChange={(page) => updateQuery({ page })} /></div>
    </>}</div>;
}
