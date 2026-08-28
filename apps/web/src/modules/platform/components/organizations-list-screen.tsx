'use client';

import Link from 'next/link';
import { Activity, Building2, GalleryHorizontal } from 'lucide-react';

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
import { useOrganizations } from '@/hooks/queries/use-platform';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';

const ORGANIZATION_STATUSES = ['', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'];

export function OrganizationsListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const organizations = useOrganizations({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    status: query.status || undefined,
  });

  if (organizations.isLoading) {
    return <LoadingState title="Loading operational entities..." description="Retrieving tenant records and organization lifecycle state." />;
  }

  if (organizations.isError) {
    return <ErrorState title="Unable to load organizations." onRetry={() => organizations.refetch()} />;
  }

  const items = organizations.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Operational Entities"
        description="Tenant-level organization records that anchor workforce, approvals, and operational scope."
        actions={
          <PermissionGate permission={permissionLabels.organizationManage}>
            <Button variant="outline" disabled>
              Create Organization
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total entities" value={organizations.data?.meta?.total ?? 0} description="Organizations currently visible in platform administration." icon={Building2} />
        <MetricCard title="Active entities" value={items.filter((item) => item.status === 'ACTIVE').length} description="Entities marked active on the current page." icon={Activity} />
        <MetricCard title="Current result window" value={items.length} description={`${formatNumber(organizations.data?.meta?.totalPages ?? 1)} pages in this result set`} icon={GalleryHorizontal} />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by organization name or slug"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <Select value={query.status} onChange={(event) => updateQuery({ status: event.target.value, page: 1 })} className="min-w-[200px]">
            {ORGANIZATION_STATUSES.map((status) => (
              <option key={status || 'all'} value={status}>
                {status ? status.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </Select>
        }
        onReset={() => resetQuery(['search', 'status', 'page'])}
      />

      {items.length === 0 ? (
        <EmptyState title="No organizations found" description="No tenant entities matched the current query state." />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={organizations.data?.meta}
            columns={[
              { key: 'name', title: 'Organization', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.name}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.slug}</p></div> },
              { key: 'status', title: 'Status', sortable: true, render: (row) => <StatusBadge value={row.status} /> },
              { key: 'createdAt', title: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
              { key: 'updatedAt', title: 'Updated', sortable: true, render: (row) => formatDate(row.updatedAt) },
            ]}
            rowActions={(row) => (
              <div className="flex justify-end">
                <Link href={`/settings/organizations/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                  View profile
                </Link>
              </div>
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {formatNumber(items.length)} of {formatNumber(organizations.data?.meta?.total ?? items.length)} organizations
            </p>
            <PaginationControls meta={organizations.data?.meta} onPageChange={(page) => updateQuery({ page })} />
          </div>
        </>
      )}
    </div>
  );
}
