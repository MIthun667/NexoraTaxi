'use client';

import Link from 'next/link';
import { Activity, Blocks, Layers3 } from 'lucide-react';

import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDepartments } from '@/hooks/queries/use-platform';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';
import { PermissionGate } from '@/components/layout/permission-gate';

const DEPARTMENT_STATUSES = ['', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

export function DepartmentsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const departments = useDepartments({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    status: query.status || undefined,
  });

  if (departments.isLoading) {
    return <LoadingState title="Loading operational divisions..." description="Retrieving department records and lifecycle state." />;
  }

  if (departments.isError) {
    return <ErrorState title="Unable to load departments." onRetry={() => departments.refetch()} />;
  }

  const items = departments.data?.items ?? [];
  const activeCount = items.filter((item) => item.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce structure"
        title="Operational Divisions"
        description="Track division codes, lifecycle state, and organizational structure across the admin center."
        actions={
          <PermissionGate permission={permissionLabels.departmentManage}>
            <Button variant="outline" disabled title="Division creation can be wired in the next UI phase.">
              Create Division
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total divisions" value={departments.data?.meta?.total ?? 0} description="Active and archived operational divisions." icon={Blocks} />
        <MetricCard title="Active divisions" value={activeCount} description="Visible divisions currently marked active on this page." icon={Activity} />
        <MetricCard title="Current page" value={items.length} description={`${formatNumber(departments.data?.meta?.totalPages ?? 1)} pages in the current result set`} icon={Layers3} />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by division name or code"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <Select value={query.status} onChange={(event) => updateQuery({ status: event.target.value, page: 1 })} className="min-w-[200px]">
            {DEPARTMENT_STATUSES.map((status) => (
              <option key={status || 'all'} value={status}>
                {status ? status.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </Select>
        }
        onReset={() => resetQuery(['search', 'status', 'page'])}
      />

      {items.length === 0 ? (
        <EmptyState title="No divisions found" description="Try broadening the search or reset lifecycle filters to inspect the division catalog." />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={departments.data?.meta}
            columns={[
              { key: 'name', title: 'Division', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.name}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.code}</p></div> },
              { key: 'description', title: 'Description', render: (row) => row.description ?? '-' },
              { key: 'status', title: 'Status', sortable: true, render: (row) => <StatusBadge value={row.status} /> },
              { key: 'organizationId', title: 'Organization Ref', render: (row) => row.organizationId },
              { key: 'updatedAt', title: 'Updated', sortable: true, render: (row) => formatDate(row.updatedAt) },
            ]}
            rowActions={(row) => (
              <div className="flex justify-end">
                <Link href={`/departments/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                  View profile
                </Link>
              </div>
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {formatNumber(items.length)} of {formatNumber(departments.data?.meta?.total ?? items.length)} divisions
            </p>
            <PaginationControls meta={departments.data?.meta} onPageChange={(page) => updateQuery({ page })} />
          </div>
        </>
      )}
    </div>
  );
}
