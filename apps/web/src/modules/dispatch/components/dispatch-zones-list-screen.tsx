'use client';

import Link from 'next/link';
import { Gauge, MapPinned, Radar } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { Select } from '@/components/ui/select';
import { useDispatchZones } from '@/hooks/queries/use-dispatch-assignments';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { formatDate, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';

export function DispatchZonesListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const zones = useDispatchZones({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    organizationId: query.organizationId || undefined,
    isActive: query.isActive === '' ? undefined : query.isActive,
  });
  const items = zones.data?.items ?? [];

  if (zones.isLoading) return <LoadingState title="Loading operational zones..." description="Fetching zone metadata and control-plane scope." />;
  if (zones.isError) return <ErrorState title="Unable to load operational zones." onRetry={() => zones.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Operational Zones" description="Operational zone registry used for spatial control, assignment scoping, and shift orchestration." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total zones" value={zones.data?.meta?.total ?? 0} description="Operational zones visible in the current tenant scope." icon={MapPinned} />
        <MetricCard title="Active zones" value={items.filter((item) => item.isActive).length} description="Zones marked active on this page." icon={Gauge} />
        <MetricCard title="Current window" value={items.length} description={`${formatNumber(zones.data?.meta?.totalPages ?? 1)} pages in the result set`} icon={Radar} />
      </div>
      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by zone code or name"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={<Select value={query.isActive} onChange={(event) => updateQuery({ isActive: event.target.value, page: 1 })} className="min-w-[180px]"><option value="">All activity states</option><option value="true">Active</option><option value="false">Inactive</option></Select>}
        onReset={() => resetQuery(['search', 'page', 'isActive'])}
      />
      {items.length === 0 ? <EmptyState title="No operational zones found" description="Reset the search or activity filter to inspect the zone registry." /> : <>
        <DataTable
          data={items}
          rowKey={(row) => row.id}
          meta={zones.data?.meta}
          columns={[
            { key: 'code', title: 'Zone', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.name}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.code}</p></div> },
            { key: 'description', title: 'Description', render: (row) => row.description ?? '-' },
            { key: 'isActive', title: 'Activity', render: (row) => row.isActive ? 'Active' : 'Inactive' },
            { key: 'updatedAt', title: 'Updated', render: (row) => formatDate(row.updatedAt) },
          ]}
          rowActions={(row) => <Link href={`/operations/zones/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open zone</Link>}
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(zones.data?.meta?.total ?? items.length)} zones</p>
          <PaginationControls meta={zones.data?.meta} onPageChange={(page) => updateQuery({ page })} />
        </div>
      </>}
    </div>
  );
}
