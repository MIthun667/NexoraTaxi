'use client';

import Link from 'next/link';

import { MaintenanceRecordsTable } from '@/components/tables/maintenance-records-table';
import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { DetailSection } from '@/components/layout/detail-section';
import { TimelineCard } from '@/components/layout/timeline-card';
import { PermissionGate } from '@/components/layout/permission-gate';
import { ComplianceBadge } from '@/components/ui/compliance-badge';
import { OperationalStatusBadge } from '@/components/ui/operational-status-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useFleetMaintenanceRecords, useFleetStatusHistory, useFleetVehicle } from '@/hooks/queries/use-fleet-vehicles';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatDateTime, formatEnumLabel } from '@/lib/utils';
import { UpdateFleetStatusForm } from '@/modules/fleet/components/update-fleet-status-form';
import { MetricCard } from '@/modules/shared/components/metric-card';
import { ShieldAlert, ShieldCheck, Wrench, Zap } from 'lucide-react';

export function FleetVehicleDetailScreen({ id }: { id: string }) {
  const vehicle = useFleetVehicle(id);
  const maintenance = useFleetMaintenanceRecords(id);
  const statusHistory = useFleetStatusHistory(id);

  if (vehicle.isLoading) {
    return <LoadingState title="Loading asset profile..." description="Resolving compliance metadata, maintenance records, and readiness history." />;
  }

  if (vehicle.isError || !vehicle.data) {
    return <ErrorState title="Unable to load asset profile." onRetry={() => vehicle.refetch()} />;
  }

  const record = vehicle.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asset profile"
        title={`${record.make} ${record.model}`}
        description="Asset profile with operational readiness, compliance artifacts, and maintenance history."
        actions={<Link href="/assets/vehicles" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to assets</Link>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <OperationalStatusBadge value={record.operationalStatus} />
        <ComplianceBadge value={record.complianceStatus} />
        <StatusBadge value={record.assignmentStatus} />
        <span className="text-sm text-slate-500">Asset code {record.assetId}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Operational readiness" value={record.isDispatchReady ? 1 : 0} description={record.isDispatchReady ? 'Asset currently ready for operations.' : 'Asset is not currently ready for operations.'} icon={record.isDispatchReady ? Zap : ShieldAlert} />
        <MetricCard title="Maintenance records" value={maintenance.data?.length ?? 0} description="Tracked maintenance events for this asset." icon={Wrench} />
        <MetricCard title="Compliance posture" value={record.complianceStatus === 'COMPLIANT' ? 1 : 0} description={formatEnumLabel(record.complianceStatus)} icon={record.complianceStatus === 'COMPLIANT' ? ShieldCheck : ShieldAlert} />
        <MetricCard title="Status changes" value={statusHistory.data?.length ?? 0} description="Lifecycle changes recorded for this asset." icon={ShieldAlert} />
      </div>
      <EntityMetaGrid
        items={[
          { label: 'Asset code', value: record.assetId },
          { label: 'Plate number', value: record.plateNumber },
          { label: 'VIN', value: record.vin },
          { label: 'Asset class', value: record.vehicleClass },
          { label: 'Registration', value: record.registrationNumber },
          { label: 'Registration expiry', value: record.registrationExpiresAt ? formatDate(record.registrationExpiresAt) : null },
          { label: 'Insurance policy', value: record.insurancePolicyNumber },
          { label: 'Insurance expiry', value: record.insuranceExpiresAt ? formatDate(record.insuranceExpiresAt) : null },
          { label: 'Joined', value: formatDate(record.joinedAt) },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <DetailSection title="Maintenance records" description="Tracked maintenance events and service execution history.">
            <MaintenanceRecordsTable items={maintenance.data ?? []} />
          </DetailSection>
          <TimelineCard
            title="Status history"
            description="Auditable readiness and lifecycle changes for this asset."
            items={(statusHistory.data ?? []).map((entry) => ({
              id: entry.id,
              title: `${formatEnumLabel(entry.statusCategory)} changed to ${formatEnumLabel(entry.newValue)}`,
              description: entry.reason ?? entry.previousValue ? `Previous value: ${entry.previousValue ?? 'n/a'}` : null,
              timestamp: formatDateTime(entry.createdAt),
              meta: entry.changedByUserId ? <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Actor {entry.changedByUserId.slice(0, 8)}</span> : null,
            }))}
          />
        </div>
        <div className="space-y-4">
          <DetailSection title="Readiness posture" description="Operational and compliance signals used for assignment eligibility.">
            <div className="space-y-3 text-sm text-slate-300">
              <p>Operational status: <span className="text-white">{formatEnumLabel(record.operationalStatus)}</span></p>
              <p>Compliance status: <span className="text-white">{formatEnumLabel(record.complianceStatus)}</span></p>
              <p>Assignment status: <span className="text-white">{formatEnumLabel(record.assignmentStatus)}</span></p>
              <p>Decommissioned at: <span className="text-white">{record.decommissionedAt ? formatDateTime(record.decommissionedAt) : 'Active asset'}</span></p>
            </div>
          </DetailSection>
          <PermissionGate permission={permissionLabels.assetStatusManage}>
            <UpdateFleetStatusForm vehicleId={id} />
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
