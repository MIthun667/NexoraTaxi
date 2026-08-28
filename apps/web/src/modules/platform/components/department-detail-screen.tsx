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
import { useDepartment, useOrganization } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';

export function DepartmentDetailScreen({ id }: { id: string }) {
  const department = useDepartment(id);
  const organization = useOrganization(department.data?.organizationId);

  if (department.isLoading) {
    return <LoadingState title="Loading operational division..." description="Resolving division profile and organization ownership." />;
  }

  if (department.isError || !department.data) {
    return <ErrorState title="Unable to load the division profile." onRetry={() => department.refetch()} />;
  }

  const record = department.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department profile"
        title={record.name}
        description="Operational division profile, ownership context, and lifecycle status."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/departments" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Back to divisions
            </Link>
            <PermissionGate permission={permissionLabels.departmentManage}>
              <Button variant="outline" disabled>
                Manage division
              </Button>
            </PermissionGate>
          </div>
        }
      />
      <div className="flex items-center gap-3">
        <StatusBadge value={record.status} />
        <span className="text-sm text-slate-500">Division code {record.code}</span>
      </div>
      <DetailGrid
        items={[
          { label: 'Division code', value: record.code },
          { label: 'Description', value: record.description },
          { label: 'Organization', value: organization.data?.name ?? record.organizationId, href: organization.data ? `/settings/organizations/${organization.data.id}` : undefined },
          { label: 'Created', value: formatDateTime(record.createdAt) },
          { label: 'Updated', value: formatDateTime(record.updatedAt) },
        ]}
      />
      <SectionCard title="Operational context" description="Structure and ownership metadata used by workforce orchestration.">
        <div className="space-y-4 text-sm text-slate-300">
          <p>Status: <span className="text-white">{record.status.replaceAll('_', ' ')}</span></p>
          <p>Organization scope: <span className="text-white">{organization.data?.name ?? 'Pending organization lookup'}</span></p>
          <p>Description: <span className="text-white">{record.description ?? 'No additional division description was provided.'}</span></p>
        </div>
      </SectionCard>
    </div>
  );
}
