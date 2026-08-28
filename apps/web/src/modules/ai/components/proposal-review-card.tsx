'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useExecuteAction } from '@/hooks/queries/use-ai-command-center';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';
import { AgentProposalItem } from '@/types/ai';

export function ProposalReviewCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: AgentProposalItem;
  onApprove?: (comment?: string) => void;
  onReject?: (comment?: string) => void;
}) {
  const [comment, setComment] = useState('');
  const { hasPermission } = useAuth();
  const executeMutation = useExecuteAction();
  const canReview = hasPermission(permissionLabels.agentReview);

  const handleExecute = async () => {
    await executeMutation.mutateAsync({ 
      proposalId: proposal.id,
      organizationId: proposal.organizationId ?? undefined 
    });
    setComment('');
  };

  const isHandled =
    proposal.status === 'REJECTED' ||
    proposal.status === 'EXECUTED' ||
    proposal.executionStatus === 'SUCCEEDED' ||
    proposal.executionStatus === 'PENDING_APPROVAL' ||
    Boolean(proposal.approvalRequestId);

  return (
    <Card className="border-white/10 bg-slate-950/50">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{formatEnumLabel(proposal.actionType)}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              {proposal.summary}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SeverityBadge value={proposal.riskLevel} />
            <StatusBadge value={proposal.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-300">
          <Meta label="Source agent" value={proposal.agentName} />
          <Meta label="Target" value={`${proposal.targetEntityType ?? 'n/a'} ${proposal.targetEntityId ?? ''}`.trim()} />
          <Meta
            label="Execution"
            value={proposal.executionStatus ? formatEnumLabel(proposal.executionStatus) : 'Pending review'}
          />
          <Meta label="Confidence" value={proposal.confidence ?? 'Unknown'} />
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-300">
          <Meta label="Approval link" value={proposal.approvalRequestId ?? 'Not routed'} />
          <Meta label="Created" value={formatDateTime(proposal.createdAt)} />
          <Meta label="Updated" value={formatDateTime(proposal.updatedAt)} />
        </div>
        {proposal.executionSummary ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            {proposal.executionSummary}
          </div>
        ) : null}
        {proposal.payload ? (
          <pre className="overflow-x-auto rounded-2xl bg-slate-950/80 p-4 text-xs text-slate-300">
            {JSON.stringify(proposal.payload, null, 2)}
          </pre>
        ) : null}
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add an operator note before approving, rejecting, modifying, or escalating."
          rows={4}
        />
        {!canReview ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Review actions require the intelligence review permission.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button 
            disabled={!canReview || isHandled || executeMutation.isPending} 
            onClick={handleExecute}
            className="bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {executeMutation.isPending ? 'Executing...' : 'Execute'}
          </Button>
          <Button disabled={!canReview || isHandled} onClick={() => onApprove?.(comment)}>
            Send to approval/workflow
          </Button>
          <Button variant="secondary" disabled={!canReview || isHandled} onClick={() => onReject?.(comment)}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value || '-'}</p>
    </div>
  );
}
