'use client';

import Link from 'next/link';

import { DocumentsTable } from '@/components/tables/documents-table';
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
import { useDriver, useDriverDocuments, useDriverStatusHistory } from '@/hooks/queries/use-drivers';
import { useEmployee } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatDateTime, formatEnumLabel } from '@/lib/utils';
import { UpdateDriverStatusForm } from '@/modules/drivers/components/update-driver-status-form';
import { MetricCard } from '@/modules/shared/components/metric-card';
import { ShieldCheck, ShieldX, UserRoundCheck, UserRoundX } from 'lucide-react';

export function DriverDetailScreen({ id }: { id: string }) {
  const driver = useDriver(id);
  const documents = useDriverDocuments(id);
  const statusHistory = useDriverStatusHistory(id);
  const employee = useEmployee(driver.data?.employeeId ?? undefined);

  if (driver.isLoading) {
    return <LoadingState title="Loading operator profile..." description="Resolving operator identity, compliance registry, and operational history." />;
  }

  if (driver.isError || !driver.data) {
    return <ErrorState title="Unable to load member profile." onRetry={() => driver.refetch()} />;
  }

  const record = driver.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operator profile"
        title={`${record.firstName} ${record.lastName}`}
        description="Operator profile with compliance posture, assignment readiness, and operational audit trail."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/operators" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to operators</Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OperationalStatusBadge value={record.operationalStatus} />
        <ComplianceBadge value={record.complianceStatus} />
        <StatusBadge value={record.assignmentStatus} />
        <span className="text-sm text-slate-500">Workforce ID {record.workforceId}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Eligibility" value={record.isEligibleForAssignment ? 1 : 0} description={record.isEligibleForAssignment ? 'Operator currently eligible for resource assignment.' : 'Operator is not currently assignment eligible.'} icon={record.isEligibleForAssignment ? UserRoundCheck : UserRoundX} />
        <MetricCard title="Compliance posture" value={record.complianceStatus === 'COMPLIANT' ? 1 : 0} description={formatEnumLabel(record.complianceStatus)} icon={record.complianceStatus === 'COMPLIANT' ? ShieldCheck : ShieldX} />
        <MetricCard title="Documents" value={documents.data?.length ?? 0} description="Compliance and document records registered for this operator." icon={ShieldCheck} />
        <MetricCard title="Status changes" value={statusHistory.data?.length ?? 0} description="Lifecycle audit entries captured for this operator." icon={ShieldX} />
      </div>

      <EntityMetaGrid
        items={[
          { label: 'Workforce ID', value: record.workforceId },
          { label: 'Work email', value: record.workEmail },
          { label: 'Phone number', value: record.phoneNumber },
          { label: 'License number', value: record.licenseNumber },
          { label: 'License issued', value: record.licenseIssuedAt ? formatDate(record.licenseIssuedAt) : null },
          { label: 'License expires', value: record.licenseExpiresAt ? formatDate(record.licenseExpiresAt) : null },
          { label: 'Joined', value: formatDate(record.joinedAt) },
          { label: 'Linked employee', value: employee.data ? `${employee.data.firstName} ${employee.data.lastName}` : record.employeeId },
          { label: 'Linked user', value: record.userId },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <DetailSection title="Compliance registry" description="Current document and verification posture for this operator.">
            <DocumentsTable items={documents.data ?? []} />
          </DetailSection>
          <TimelineCard
            title="Status history"
            description="Audit trail of operator lifecycle changes across onboarding, compliance, operational, and assignment states."
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
          <DetailSection title="Operational summary" description="Readiness signals and linkage across the operator lifecycle.">
            <div className="space-y-3 text-sm text-slate-300">
              <p>Onboarding status: <span className="text-white">{formatEnumLabel(record.onboardingStatus)}</span></p>
              <p>Operational status: <span className="text-white">{formatEnumLabel(record.operationalStatus)}</span></p>
              <p>Compliance status: <span className="text-white">{formatEnumLabel(record.complianceStatus)}</span></p>
              <p>Assignment status: <span className="text-white">{formatEnumLabel(record.assignmentStatus)}</span></p>
              <p>Suspended at: <span className="text-white">{record.suspendedAt ? formatDateTime(record.suspendedAt) : 'Not suspended'}</span></p>
            </div>
          </DetailSection>
          <PermissionGate permission={permissionLabels.operatorStatusManage}>
            <UpdateDriverStatusForm driverId={id} />
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
