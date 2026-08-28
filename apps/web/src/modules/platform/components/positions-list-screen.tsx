'use client';

import Link from 'next/link';
import { Activity, BriefcaseBusiness, PencilRuler } from 'lucide-react';

import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { usePositions } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';

const POSITION_STATUSES = ['', 'DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

export function PositionsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const positions = usePositions({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    status: query.status || undefined,
  });

  if (positions.isLoading) {
    return <LoadingState title="Loading workforce roles..." description="Retrieving role catalog and lifecycle state." />;
  }

  if (positions.isError) {
    return <ErrorState title="Unable to load workforce roles." onRetry={() => positions.refetch()} />;
  }

  const items = positions.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Role catalog"
        title="Workforce Roles"
        description="Inspect role design, grading, and division alignment across the workforce model."
        actions={
          <PermissionGate permission={permissionLabels.positionManage}>
            <Button variant="outline" disabled>
              Create Role
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total roles" value={positions.data?.meta?.total ?? 0} description="Role records across the visible tenant scope." icon={BriefcaseBusiness} />
        <MetricCard title="Active roles" value={items.filter((item) => item.status === 'ACTIVE').length} description="Roles visible on this page that are active." icon={Activity} />
        <MetricCard title="Draft roles" value={items.filter((item) => item.status === 'DRAFT').length} description={`${formatNumber(items.length)} visible on the current page`} icon={PencilRuler} />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by role title or code"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <Select value={query.status} onChange={(event) => updateQuery({ status: event.target.value, page: 1 })} className="min-w-[200px]">
            {POSITION_STATUSES.map((status) => (
              <option key={status || 'all'} value={status}>
                {status ? status.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </Select>
        }
        onReset={() => resetQuery(['search', 'status', 'page'])}
      />

      {items.length === 0 ? (
        <EmptyState title="No workforce roles found" description="Try a broader query or reset filters to inspect the role catalog." />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={positions.data?.meta}
            columns={[
              { key: 'title', title: 'Role', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.code}</p></div> },
              { key: 'gradeLevel', title: 'Grade', render: (row) => row.gradeLevel ?? '-' },
              { key: 'departmentId', title: 'Division Ref', render: (row) => row.departmentId ?? '-' },
              { key: 'status', title: 'Status', sortable: true, render: (row) => <StatusBadge value={row.status} /> },
              { key: 'updatedAt', title: 'Updated', sortable: true, render: (row) => formatDate(row.updatedAt) },
            ]}
            rowActions={(row) => (
              <div className="flex justify-end">
                <Link href={`/positions/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                  View profile
                </Link>
              </div>
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {formatNumber(items.length)} of {formatNumber(positions.data?.meta?.total ?? items.length)} roles
            </p>
            <PaginationControls meta={positions.data?.meta} onPageChange={(page) => updateQuery({ page })} />
          </div>
        </>
      )}
    </div>
  );
}
