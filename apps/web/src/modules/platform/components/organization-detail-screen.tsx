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
import { useOrganization } from '@/hooks/queries/use-platform';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';

export function OrganizationDetailScreen({ id }: { id: string }) {
  const organization = useOrganization(id);

  if (organization.isLoading) {
    return <LoadingState title="Loading organization profile..." description="Retrieving tenant profile and organization lifecycle metadata." />;
  }

  if (organization.isError || !organization.data) {
    return <ErrorState title="Unable to load the organization profile." onRetry={() => organization.refetch()} />;
  }

  const record = organization.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization profile"
        title={record.name}
        description="Tenant-level operational entity profile for the Nexora control plane."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings/organizations" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Back to organizations
            </Link>
            <PermissionGate permission={permissionLabels.organizationManage}>
              <Button variant="outline" disabled>
                Manage organization
              </Button>
            </PermissionGate>
          </div>
        }
      />
      <div className="flex items-center gap-3">
        <StatusBadge value={record.status} />
        <span className="text-sm text-slate-500">Slug {record.slug}</span>
      </div>
      <DetailGrid
        items={[
          { label: 'Organization name', value: record.name },
          { label: 'Slug', value: record.slug },
          { label: 'Created', value: formatDateTime(record.createdAt) },
          { label: 'Updated', value: formatDateTime(record.updatedAt) },
        ]}
      />
      <SectionCard title="Tenant control plane" description="Core tenant identity and lifecycle metadata for platform administration.">
        <div className="space-y-4 text-sm text-slate-300">
          <p>Status: <span className="text-white">{record.status.replaceAll('_', ' ')}</span></p>
          <p>Primary slug: <span className="text-white">{record.slug}</span></p>
          <p>Record updated: <span className="text-white">{formatDateTime(record.updatedAt)}</span></p>
        </div>
      </SectionCard>
    </div>
  );
}
