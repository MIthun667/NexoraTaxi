'use client';

import Link from 'next/link';

import { DetailSection } from '@/components/layout/detail-section';
import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { TimelineCard } from '@/components/layout/timeline-card';
import { PermissionGate } from '@/components/layout/permission-gate';
import { StatusBadge } from '@/components/ui/status-badge';
import { useApprovalRequest, useApprovalStep } from '@/hooks/queries/use-approvals';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';
import { ApprovalDecisionPanel } from '@/modules/approvals/components/approval-decision-panel';

export function ApprovalDetailScreen({ id }: { id: string }) {
  const request = useApprovalRequest(id);
  const activeStepId = request.data?.steps.find((step) => step.status === 'PENDING')?.id;
  const activeStep = useApprovalStep(activeStepId);
  if (request.isLoading) return <LoadingState title="Loading approval request..." description="Resolving approval metadata, decision chain, and current actionable step." />;
  if (request.isError || !request.data) return <ErrorState title="Unable to load approval request." onRetry={() => request.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Approval request" title={request.data.title} description="Approval detail surface with sequential step progression and decision history." actions={<Link href="/approvals" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to approvals</Link>} />
    <div className="flex items-center gap-3"><StatusBadge value={request.data.status} /></div>
    <EntityMetaGrid items={[
      { label: 'Entity type', value: request.data.entityType },
      { label: 'Entity ID', value: request.data.entityId },
      { label: 'Workflow instance', value: request.data.workflowInstanceId, href: request.data.workflowInstanceId ? `/workflows/${request.data.workflowInstanceId}` : undefined },
      { label: 'Requested by', value: request.data.requestedByUserId },
      { label: 'Submitted at', value: request.data.submittedAt ? formatDateTime(request.data.submittedAt) : null },
      { label: 'Resolved at', value: request.data.resolvedAt ? formatDateTime(request.data.resolvedAt) : null },
      { label: 'Description', value: request.data.description },
    ]} />
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <DetailSection title="Approval steps" description="Sequential approval chain for the current request.">
          <div className="space-y-3">
            {request.data.steps.map((step) => <div key={step.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-white">{step.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{step.stepKey}</p></div><StatusBadge value={step.status} /></div><p className="mt-2 text-sm text-slate-400">Sequence {step.sequenceOrder}</p></div>)}
          </div>
        </DetailSection>
        <TimelineCard title="Decision history" description="Decision log for the current actionable approval step." items={(activeStep.data?.decisions ?? []).map((decision) => ({ id: decision.id, title: formatEnumLabel(decision.decisionType), description: decision.comment, timestamp: formatDateTime(decision.createdAt) }))} />
      </div>
      <div className="space-y-4">
        {activeStepId ? <PermissionGate permission={permissionLabels.approvalAct}><ApprovalDecisionPanel stepId={activeStepId} /></PermissionGate> : null}
      </div>
    </div>
  </div>;
}
