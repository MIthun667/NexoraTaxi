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
import { useDepartment, useEmployee, useOrganization, usePosition } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDate, formatDateTime } from '@/lib/utils';

export function EmployeeDetailScreen({ id }: { id: string }) {
  const employee = useEmployee(id);
  const organization = useOrganization(employee.data?.organizationId);
  const department = useDepartment(employee.data?.departmentId ?? undefined);
  const position = usePosition(employee.data?.positionId ?? undefined);

  if (employee.isLoading) {
    return <LoadingState title="Loading employee profile..." description="Resolving workforce member profile and linked organizational context." />;
  }

  if (employee.isError || !employee.data) {
    return <ErrorState title="Unable to load the employee profile." onRetry={() => employee.refetch()} />;
  }

  const record = employee.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employee profile"
        title={`${record.firstName} ${record.lastName}`}
        description="Detailed workforce member profile aligned to the current operational structure."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/employees" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Back to workforce
            </Link>
            <PermissionGate permission={permissionLabels.employeeManage}>
              <Button variant="outline" disabled title="Management actions can be wired to edit/archive flows next.">
                Manage record
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge value={record.employmentStatus} />
        <span className="text-sm text-slate-500">Employee code {record.employeeCode}</span>
      </div>

      <DetailGrid
        items={[
          { label: 'Work email', value: record.workEmail },
          { label: 'Phone number', value: record.phoneNumber },
          { label: 'Hire date', value: formatDate(record.hireDate) },
          { label: 'Organization', value: organization.data?.name ?? record.organizationId, href: organization.data ? `/settings/organizations/${organization.data.id}` : undefined },
          { label: 'Department', value: department.data?.name ?? record.departmentId, href: department.data ? `/departments/${department.data.id}` : undefined },
          { label: 'Position', value: position.data?.title ?? record.positionId, href: position.data ? `/positions/${position.data.id}` : undefined },
          { label: 'Linked user', value: record.userId },
          { label: 'Created', value: formatDateTime(record.createdAt) },
          { label: 'Updated', value: formatDateTime(record.updatedAt) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Workforce placement" description="Current organizational placement and staffing references.">
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operational entity</p>
              <p className="mt-1 text-white">{organization.data?.name ?? 'Organization reference pending'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operational division</p>
              <p className="mt-1 text-white">{department.data?.name ?? 'Unassigned division'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workforce role</p>
              <p className="mt-1 text-white">{position.data?.title ?? 'Unassigned role'}</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Lifecycle summary" description="Profile-level operational metadata for workforce governance.">
          <div className="space-y-4 text-sm text-slate-300">
            <p>Employment status: <span className="text-white">{record.employmentStatus.replaceAll('_', ' ')}</span></p>
            <p>User linkage: <span className="text-white">{record.userId ? 'Linked' : 'Not linked'}</span></p>
            <p>Record last updated: <span className="text-white">{formatDateTime(record.updatedAt)}</span></p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
