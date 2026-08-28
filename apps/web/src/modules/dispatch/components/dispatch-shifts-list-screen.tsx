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
import { useDispatchShifts } from '@/hooks/queries/use-dispatch-assignments';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { formatDateTime, formatNumber } from '@/lib/utils';

export function DispatchShiftsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const shifts = useDispatchShifts({ page: query.page, limit: query.limit, search: query.search || undefined, organizationId: query.organizationId || undefined, zoneId: query.zoneId || undefined, status: query.status || undefined });
  const items = shifts.data?.items ?? [];
  if (shifts.isLoading) return <LoadingState title="Loading operational shifts..." description="Fetching shift windows, zone linkage, and supervisor references." />;
  if (shifts.isError) return <ErrorState title="Unable to load operational shifts." onRetry={() => shifts.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operations" title="Operational Shifts" description="Shift windows, supervisory ownership, and zone-linked operating periods." />
    <TableToolbar searchValue={query.search} searchPlaceholder="Search by shift code or title" onSearchChange={(value) => updateQuery({ search: value, page: 1 })} onReset={() => resetQuery(['search','page','status','zoneId'])} />
    {items.length === 0 ? <EmptyState title="No shifts found" description="Broaden the shift query or reset the current filters." /> : <>
      <DataTable data={items} rowKey={(row) => row.id} meta={shifts.data?.meta} columns={[
        { key: 'code', title: 'Shift', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.code}</p></div> },
        { key: 'zoneId', title: 'Zone Ref', render: (row) => row.zoneId ?? '-' },
        { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
        { key: 'startsAt', title: 'Starts', render: (row) => formatDateTime(row.startsAt) },
        { key: 'endsAt', title: 'Ends', render: (row) => formatDateTime(row.endsAt) },
      ]} rowActions={(row) => <Link href={`/operations/shifts/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open shift</Link>} />
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(shifts.data?.meta?.total ?? items.length)} shifts</p><PaginationControls meta={shifts.data?.meta} onPageChange={(page) => updateQuery({ page })} /></div>
    </>}</div>;
}
