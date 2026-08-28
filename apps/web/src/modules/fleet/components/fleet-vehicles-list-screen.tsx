'use client';

import Link from 'next/link';
import { CarFront, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';

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
import { useFleetVehicles } from '@/hooks/queries/use-fleet-vehicles';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatNumber } from '@/lib/utils';
import { CreateFleetVehicleForm } from '@/modules/fleet/components/create-fleet-vehicle-form';
import { MetricCard } from '@/modules/shared/components/metric-card';

const OPTIONS = ['', 'SEDAN', 'HATCHBACK', 'SUV', 'MICRO', 'EXECUTIVE', 'PREMIUM', 'VAN', 'OTHER', 'PENDING', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'ACTIVE', 'INACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE', 'SUSPENDED', 'BLOCKED', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'AVAILABLE', 'ASSIGNED', 'RESERVED', 'UNAVAILABLE', 'RESTRICTED'];

export function FleetVehiclesListScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState();
  const vehicles = useFleetVehicles({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    organizationId: query.organizationId || undefined,
    vehicleClass: query.vehicleClass || undefined,
    onboardingStatus: query.onboardingStatus || undefined,
    operationalStatus: query.operationalStatus || undefined,
    complianceStatus: query.complianceStatus || undefined,
    assignmentStatus: query.assignmentStatus || undefined,
  });
  const items = vehicles.data?.items ?? [];
  const organizationId = items[0]?.organizationId;

  if (vehicles.isLoading) {
    return <LoadingState title="Loading assets..." description="Retrieving asset readiness, compliance, and availability state." />;
  }

  if (vehicles.isError) {
    return <ErrorState title="Unable to load assets." onRetry={() => vehicles.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asset operations"
        title="Asset Registry"
        description="Track asset readiness, compliance artifacts, serviceability, and assignment availability."
        actions={
          <PermissionGate permission={permissionLabels.assetManage}>
            <Button variant="outline" disabled={!organizationId}>Create asset</Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total assets" value={vehicles.data?.meta?.total ?? 0} description="Assets visible in the current result scope." icon={CarFront} />
        <MetricCard title="Operationally ready" value={items.filter((item) => item.isDispatchReady).length} description="Assets ready for operational assignment on this page." icon={ShieldCheck} />
        <MetricCard title="Compliance risk" value={items.filter((item) => item.complianceStatus !== 'COMPLIANT').length} description="Assets requiring compliance follow-up." icon={ShieldAlert} />
        <MetricCard title="Out of service" value={items.filter((item) => item.operationalStatus === 'OUT_OF_SERVICE').length} description="Assets currently unavailable due to service state." icon={Wrench} />
      </div>

      <PermissionGate permission={permissionLabels.assetManage}>
        <CreateFleetVehicleForm organizationId={organizationId} />
      </PermissionGate>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by asset code, plate, make, model, registration, or VIN"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        filters={
          <>
            <Select value={query.vehicleClass} onChange={(event) => updateQuery({ vehicleClass: event.target.value, page: 1 })} className="min-w-[180px]">
              {OPTIONS.map((value) => (
                <option key={`class-${value || 'all'}`} value={value}>
                  {value ? value.replaceAll('_', ' ') : 'All asset classes'}
                </option>
              ))}
            </Select>
            <Select value={query.operationalStatus} onChange={(event) => updateQuery({ operationalStatus: event.target.value, page: 1 })} className="min-w-[180px]">
              {OPTIONS.map((value) => (
                <option key={`op-${value || 'all'}`} value={value}>
                  {value ? value.replaceAll('_', ' ') : 'All operational states'}
                </option>
              ))}
            </Select>
            <Select value={query.complianceStatus} onChange={(event) => updateQuery({ complianceStatus: event.target.value, page: 1 })} className="min-w-[180px]">
              {OPTIONS.map((value) => (
                <option key={`comp-${value || 'all'}`} value={value}>
                  {value ? value.replaceAll('_', ' ') : 'All compliance states'}
                </option>
              ))}
            </Select>
          </>
        }
        onReset={() => resetQuery(['search', 'page', 'vehicleClass', 'operationalStatus', 'complianceStatus', 'assignmentStatus', 'onboardingStatus'])}
      />

      {items.length === 0 ? (
        <EmptyState title="No assets found" description="Reset the filters or broaden the asset search to inspect the operations registry." />
      ) : (
        <>
          <DataTable
            data={items}
            rowKey={(row) => row.id}
            meta={vehicles.data?.meta}
            columns={[
              { key: 'assetId', title: 'Asset', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.make} {row.model}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.assetId}</p></div> },
              { key: 'plateNumber', title: 'Plate', sortable: true },
              { key: 'vehicleClass', title: 'Class', sortable: true },
              { key: 'operationalStatus', title: 'Operational', render: (row) => <OperationalStatusBadge value={row.operationalStatus} /> },
              { key: 'complianceStatus', title: 'Compliance', render: (row) => <ComplianceBadge value={row.complianceStatus} /> },
              { key: 'assignmentStatus', title: 'Availability', render: (row) => <StatusBadge value={row.assignmentStatus} /> },
              { key: 'joinedAt', title: 'Joined', render: (row) => formatDate(row.joinedAt) },
            ]}
            rowActions={(row) => <Link href={`/assets/vehicles/${row.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Open asset</Link>}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(vehicles.data?.meta?.total ?? items.length)} assets</p>
            <PaginationControls meta={vehicles.data?.meta} onPageChange={(page) => updateQuery({ page })} />
          </div>
        </>
      )}
    </div>
  );
}
