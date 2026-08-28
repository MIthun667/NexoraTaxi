'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Activity, UserCog, UserPlus, Users } from 'lucide-react';

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
import { useDashboardWorkforceSummary } from '@/hooks/queries/use-dashboard-overview';
import { useEmployees } from '@/hooks/queries/use-platform';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { MetricCard } from '@/modules/shared/components/metric-card';
import { PermissionGate } from '@/components/layout/permission-gate';

const EMPLOYMENT_STATUSES = ['', 'ACTIVE', 'ONBOARDING', 'PROBATION', 'LEAVE_OF_ABSENCE', 'SUSPENDED', 'TERMINATED'];

function linkButtonClassName() {
  return 'inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10';
}

export function EmployeesListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const employeesQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      employmentStatus: query.status || undefined,
    }),
    [query],
  );
  const employees = useEmployees(employeesQuery);
  const workforceSummary = useDashboardWorkforceSummary();

  if (employees.isLoading) {
    return <LoadingState title="Loading workforce roster..." description="Fetching workforce records and active employment states." />;
  }

  if (employees.isError) {
    return <ErrorState title="Unable to load workforce members." onRetry={() => employees.refetch()} />;
  }

  const items = employees.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce"
        title="Workforce Members"
        description="Track employee placement, lifecycle state, and organizational structure across enterprise operations."
        actions={
          <PermissionGate permission={permissionLabels.employeeManage}>
            <Button variant="outline" disabled title="Create flows can be added on the next UI pass.">
              Create Employee
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total workforce"
          value={workforceSummary.data?.totals.totalEmployees ?? employees.data?.meta?.total ?? 0}
          description="All workforce members in the current tenant scope."
          icon={Users}
        />
        <MetricCard
          title="Active employees"
          value={workforceSummary.data?.totals.activeEmployees ?? items.filter((item) => item.employmentStatus === 'ACTIVE').length}
          description="Employees currently cleared for active workforce participation."
          icon={Activity}
        />
        <MetricCard
          title="Onboarding queue"
          value={workforceSummary.data?.totals.onboardingEmployees ?? 0}
          description="New workforce members moving through onboarding."
          icon={UserCog}
        />
        <MetricCard
          title="Recent hires"
          value={workforceSummary.data?.totals.recentlyHiredCount ?? 0}
          description="Workforce members hired in the last 30 days."
          icon={UserPlus}
        />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by employee code, name, or email"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <Select
            value={query.status}
            onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
            className="min-w-[200px]"
          >
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status || 'all'} value={status}>
                {status ? status.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </Select>
        }
        onReset={() => resetQuery(['search', 'status', 'page'])}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No workforce members found"
          description="Adjust the search or lifecycle filters to broaden the operational roster view."
        />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={employees.data?.meta}
            columns={[
              {
                key: 'employeeCode',
                title: 'Employee',
                sortable: true,
                render: (row) => (
                  <div>
                    <p className="font-medium text-white">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {row.employeeCode}
                    </p>
                  </div>
                ),
              },
              {
                key: 'workEmail',
                title: 'Work Email',
                sortable: true,
              },
              {
                key: 'employmentStatus',
                title: 'Status',
                sortable: true,
                render: (row) => <StatusBadge value={row.employmentStatus} />,
              },
              {
                key: 'departmentId',
                title: 'Division Ref',
                render: (row) => row.departmentId ?? '-',
              },
              {
                key: 'positionId',
                title: 'Role Ref',
                render: (row) => row.positionId ?? '-',
              },
              {
                key: 'hireDate',
                title: 'Hire Date',
                sortable: true,
                render: (row) => formatDate(row.hireDate),
              },
            ]}
            rowActions={(row) => (
              <div className="flex justify-end">
                <Link href={`/employees/${row.id}`} className={linkButtonClassName()}>
                  View profile
                </Link>
              </div>
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {formatNumber(items.length)} of {formatNumber(employees.data?.meta?.total ?? items.length)} workforce members
            </p>
            <PaginationControls
              meta={employees.data?.meta}
              onPageChange={(page) => updateQuery({ page })}
            />
          </div>
        </>
      )}
    </div>
  );
}
