'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/layout/empty-state';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { DataTable } from '@/components/tables/data-table';
import { PaginationControls } from '@/components/tables/pagination-controls';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useApprovals } from '@/hooks/queries/use-approvals';
import { useAuth } from '@/hooks/use-auth';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { CreateApprovalRequestForm } from '@/modules/approvals/components/create-approval-request-form';

export function ApprovalsListScreen() {
  const { user } = useAuth();
  const { query, updateQuery, resetQuery } = useListQueryState();
  const approvals = useApprovals({ page: query.page, limit: query.limit, status: query.status || undefined, organizationId: query.organizationId || user?.organizationId || undefined });
  const items = approvals.data?.items ?? [];
  if (approvals.isLoading) return <LoadingState title="Loading approval queue..." description="Fetching approval steps currently assigned to the active principal." />;
  if (approvals.isError) return <ErrorState title="Unable to load approval queue." onRetry={() => approvals.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Approval Operations" title="Approval Queue" description="Decision-focused review workspace for pending operational approvals." actions={<PermissionGate permission={permissionLabels.approvalCreate}><Button variant="outline">Create approval request</Button></PermissionGate>} />
    <PermissionGate permission={permissionLabels.approvalCreate}><CreateApprovalRequestForm organizationId={user?.organizationId} requesterUserId={user?.id} /></PermissionGate>
    <TableToolbar searchValue={query.search} searchPlaceholder="Queue filters are driven by approval status and assignment" onSearchChange={() => {}} onReset={() => resetQuery(['page','status'])} />
    {items.length === 0 ? <EmptyState title="No approval steps assigned" description="There are no approval steps currently assigned to you or your roles." /> : <>
      <DataTable data={items} rowKey={(row) => row.id} meta={approvals.data?.meta} columns={[
        { key: 'stepKey', title: 'Step', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.stepKey}</p></div> },
        { key: 'approvalRequest', title: 'Request', render: (row) => row.approvalRequest?.title ?? '-' },
        { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
        { key: 'dueAt', title: 'Due', render: (row) => row.dueAt ? formatDateTime(row.dueAt) : '-' },
      ]} rowActions={(row) => row.approvalRequest ? <Link href={`/approvals/${row.approvalRequest.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Review</Link> : null} />
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Showing {formatNumber(items.length)} of {formatNumber(approvals.data?.meta?.total ?? items.length)} approval steps</p><PaginationControls meta={approvals.data?.meta} onPageChange={(page) => updateQuery({ page })} /></div>
    </>}</div>;
}
