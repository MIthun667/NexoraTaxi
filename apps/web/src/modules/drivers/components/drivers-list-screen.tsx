'use client';

import Link from 'next/link';
import { BriefcaseBusiness, FileCheck2, ShieldAlert, UserRoundCheck } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { Button } from '@/components/ui/button';
import { ComplianceBadge } from '@/components/ui/compliance-badge';
import { OperationalStatusBadge } from '@/components/ui/operational-status-badge';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDrivers } from '@/hooks/queries/use-drivers';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { CreateDriverForm } from '@/modules/drivers/components/create-driver-form';
import { MetricCard } from '@/modules/shared/components/metric-card';

const STATUS_OPTIONS = ['', 'PENDING', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'OFF_DUTY', 'BLOCKED', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'AVAILABLE', 'ASSIGNED', 'UNAVAILABLE', 'RESTRICTED'];

export function DriversListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const drivers = useDrivers({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    organizationId: query.organizationId || undefined,
    onboardingStatus: query.onboardingStatus || undefined,
    operationalStatus: query.operationalStatus || undefined,
    complianceStatus: query.complianceStatus || undefined,
    assignmentStatus: query.assignmentStatus || undefined,
  });
  const items = drivers.data?.items ?? [];
  const organizationId = items[0]?.organizationId;

  if (drivers.isLoading) {
    return <LoadingState title="Loading operator operations..." description="Fetching operator records, compliance posture, and assignment eligibility." />;
  }

  if (drivers.isError) {
    return <ErrorState title="Unable to load workforce." onRetry={() => drivers.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operators"
        title="Operator Operations"
        description="Manage onboarding, compliance, lifecycle posture, and assignment eligibility across enterprise operations."
        actions={
          <PermissionGate permission={permissionLabels.operatorManage}>
            <Button variant="outline" disabled={!organizationId}>
              Create operator
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total personnel" value={drivers.data?.meta?.total ?? 0} description="Workforce records currently visible in this scope." icon={BriefcaseBusiness} />
        <MetricCard title="Operationally eligible" value={items.filter((item) => item.isEligibleForAssignment).length} description="Visible operators cleared for assignment." icon={UserRoundCheck} />
        <MetricCard title="Non-compliant" value={items.filter((item) => item.complianceStatus !== 'COMPLIANT').length} description="Operators requiring compliance attention on this page." icon={ShieldAlert} />
        <MetricCard title="Verified posture" value={items.filter((item) => item.operationalStatus === 'ACTIVE').length} description="Operationally active operators on this page." icon={FileCheck2} />
      </div>

      <PermissionGate permission={permissionLabels.operatorManage}>
        <CreateDriverForm organizationId={organizationId} />
      </PermissionGate>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by workforce ID, name, email, or license number"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <>
            <Select value={query.operationalStatus} onChange={(event) => updateQuery({ operationalStatus: event.target.value, page: 1 })} className="min-w-[180px]">
              {STATUS_OPTIONS.map((status) => (
                <option key={`operational-${status || 'all'}`} value={status}>
                  {status ? `${status.replaceAll('_', ' ')}` : 'All operational states'}
                </option>
              ))}
            </Select>
            <Select value={query.complianceStatus} onChange={(event) => updateQuery({ complianceStatus: event.target.value, page: 1 })} className="min-w-[180px]">
              {STATUS_OPTIONS.map((status) => (
                <option key={`compliance-${status || 'all'}`} value={status}>
                  {status ? `${status.replaceAll('_', ' ')}` : 'All compliance states'}
                </option>
              ))}
            </Select>
            <Select value={query.assignmentStatus} onChange={(event) => updateQuery({ assignmentStatus: event.target.value, page: 1 })} className="min-w-[180px]">
              {STATUS_OPTIONS.map((status) => (
                <option key={`assignment-${status || 'all'}`} value={status}>
                  {status ? `${status.replaceAll('_', ' ')}` : 'All assignment states'}
                </option>
              ))}
            </Select>
          </>
        }
        onReset={() => resetQuery(['search', 'page', 'operationalStatus', 'complianceStatus', 'assignmentStatus', 'onboardingStatus'])}
      />

      {items.length === 0 ? (
        <EmptyState title="No operators found" description="Reset the operational filters or broaden the search to inspect the operator roster." />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={drivers.data?.meta}
            columns={[
              { key: 'workforceId', title: "Personnel", sortable: true, render: (row) => <div><p className="font-medium text-white">{row.firstName} {row.lastName}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.workforceId}</p></div> },
              { key: 'workEmail', title: 'Email', sortable: true, render: (row) => row.workEmail ?? '-' },
              { key: 'operationalStatus', title: 'Operational', render: (row) => <OperationalStatusBadge value={row.operationalStatus} /> },
              { key: 'complianceStatus', title: 'Compliance', render: (row) => <ComplianceBadge value={row.complianceStatus} /> },
              { key: 'assignmentStatus', title: 'Assignment', render: (row) => <StatusBadge value={row.assignmentStatus} /> },
              { key: 'joinedAt', title: 'Joined', render: (row) => formatDate(row.joinedAt) },
            ]}
            rowActions={(row) => (
              <Link href={`/operators/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                Open operator profile
              </Link>
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {formatNumber(items.length)} of {formatNumber(drivers.data?.meta?.total ?? items.length)} personnel
            </p>
            <PaginationControls meta={drivers.data?.meta} onPageChange={(page) => updateQuery({ page })} />
          </div>
        </>
      )}
    </div>
  );
}
