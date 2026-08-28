'use client';

import Link from 'next/link';

import { DetailGrid } from '@/components/layout/detail-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDepartment, useOrganization, usePosition } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';

export function PositionDetailScreen({ id }: { id: string }) {
  const position = usePosition(id);
  const organization = useOrganization(position.data?.organizationId);
  const department = useDepartment(position.data?.departmentId ?? undefined);

  if (position.isLoading) {
    return <LoadingState title="Loading workforce role..." description="Retrieving role profile and structural ownership." />;
  }

  if (position.isError || !position.data) {
    return <ErrorState title="Unable to load the workforce role." onRetry={() => position.refetch()} />;
  }

  const record = position.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Position profile"
        title={record.title}
        description="Structured workforce role profile aligned to the operating model."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/positions" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Back to roles
            </Link>
            <PermissionGate permission={permissionLabels.positionManage}>
              <Button variant="outline" disabled>
                Manage role
              </Button>
            </PermissionGate>
          </div>
        }
      />
      <div className="flex items-center gap-3">
        <StatusBadge value={record.status} />
        <span className="text-sm text-slate-500">Role code {record.code}</span>
      </div>
      <DetailGrid
        items={[
          { label: 'Role code', value: record.code },
          { label: 'Grade level', value: record.gradeLevel },
          { label: 'Description', value: record.description },
          { label: 'Department', value: department.data?.name ?? record.departmentId, href: department.data ? `/departments/${department.data.id}` : undefined },
          { label: 'Organization', value: organization.data?.name ?? record.organizationId, href: organization.data ? `/settings/organizations/${organization.data.id}` : undefined },
          { label: 'Created', value: formatDateTime(record.createdAt) },
          { label: 'Updated', value: formatDateTime(record.updatedAt) },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Role structure" description="Placement of the workforce role inside the operational hierarchy.">
          <div className="space-y-4 text-sm text-slate-300">
            <p>Division alignment: <span className="text-white">{department.data?.name ?? 'No division assignment'}</span></p>
            <p>Organization: <span className="text-white">{organization.data?.name ?? 'Pending lookup'}</span></p>
            <p>Grade level: <span className="text-white">{record.gradeLevel ?? 'Grade not assigned'}</span></p>
          </div>
        </SectionCard>
        <SectionCard title="Lifecycle state" description="Operational status and record metadata for role governance.">
          <div className="space-y-4 text-sm text-slate-300">
            <p>Status: <span className="text-white">{record.status.replaceAll('_', ' ')}</span></p>
            <p>Last updated: <span className="text-white">{formatDateTime(record.updatedAt)}</span></p>
            <p>Description: <span className="text-white">{record.description ?? 'No role description recorded.'}</span></p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
