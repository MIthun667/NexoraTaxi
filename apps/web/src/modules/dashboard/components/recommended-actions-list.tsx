'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  useApproveProposal,
  useRejectProposal,
} from '@/hooks/queries/use-ai-command-center';
import { useAuth } from '@/hooks/use-auth';
import { IntelligenceActionItem } from '@/lib/command-intelligence';
import { permissionLabels } from '@/lib/navigation';
import { cn, formatDateTime, formatEnumLabel } from '@/lib/utils';

export function RecommendedActionsList({
  title = 'Recommended next actions',
  description = 'Immediate priorities translated into safe, evidence-linked actions.',
  items,
}: {
  title?: string;
  description?: string;
  items: IntelligenceActionItem[];
}) {
  const approveProposal = useApproveProposal();
  const rejectProposal = useRejectProposal();
  const { hasPermission } = useAuth();
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const canReviewProposals = hasPermission(permissionLabels.agentReview);

  const hasReviewableProposals = items.some((item) => Boolean(item.proposalId));
  const availableAgents = useMemo(
    () =>
      Array.from(
        new Map(
          items
            .filter((item) => item.proposalId && item.sourceAgentCode)
            .map((item) => [
              item.sourceAgentCode as string,
              {
                code: item.sourceAgentCode as string,
                label: item.sourceAgent ?? formatEnumLabel(item.sourceAgentCode as string),
              },
            ]),
        ).values(),
      ),
    [items],
  );
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const derivedStatus = deriveActionReviewStatus(item);
      if (agentFilter && item.sourceAgentCode !== agentFilter) {
        return false;
      }

      if (statusFilter === 'pending' && derivedStatus !== 'PENDING') {
        return false;
      }

      if (statusFilter === 'handled' && derivedStatus === 'PENDING') {
        return false;
      }

      return true;
    });
  }, [agentFilter, items, statusFilter]);

  const isMutating = approveProposal.isPending || rejectProposal.isPending;

  const handleSendToApproval = async (proposalId: string) => {
    try {
      setFeedbackError(null);
      await approveProposal.mutateAsync({
        id: proposalId,
        reviewerComment: 'Sent from the AI command center for governed follow-up.',
      });
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : 'The proposal could not be sent to approval/workflow.',
      );
    }
  };

  const handleDismiss = async (proposalId: string) => {
    try {
      setFeedbackError(null);
      await rejectProposal.mutateAsync({
        id: proposalId,
        reviewerComment: 'Dismissed from the AI command center after operator review.',
      });
    } catch (error) {
      setFeedbackError(
        error instanceof Error ? error.message : 'The proposal could not be dismissed.',
      );
    }
  };

  return (
    <SectionCard
      eyebrow="Recommended actions"
      title={title}
      description={description}
    >
      <div className="space-y-4">
        {hasReviewableProposals ? (
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <Select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
              <option value="">All agents</option>
              {availableAgents.map((agent) => (
                <option key={agent.code} value={agent.code}>
                  {agent.label}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="handled">Handled</option>
            </Select>
            <Button
              variant="ghost"
              onClick={() => {
                setAgentFilter('');
                setStatusFilter('');
              }}
            >
              Reset filters
            </Button>
          </div>
        ) : null}

        {feedbackError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {feedbackError}
          </div>
        ) : null}

        {hasReviewableProposals && !canReviewProposals ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Your current role can inspect proposal context, but sending items to approval/workflow or dismissing them
            requires the intelligence review permission.
          </div>
        ) : null}

        {filteredItems.map((item) => {
          const derivedStatus = deriveActionReviewStatus(item);
          const handled = derivedStatus !== 'PENDING';
          return (
          <div key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  {item.sourceAgent ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {item.sourceAgent}
                    </span>
                  ) : null}
                  {item.actionType ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {formatEnumLabel(item.actionType)}
                    </span>
                  ) : null}
                  <span className={statusClassName(derivedStatus)}>
                    {formatDisplayStatus(derivedStatus)}
                  </span>
                </div>
                {item.detail || item.executionSummary || item.createdAt ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-400">
                    {item.detail ? <p>{item.detail}</p> : null}
                    {item.executionSummary ? <p>{item.executionSummary}</p> : null}
                    {item.createdAt ? (
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Proposed {formatDateTime(item.createdAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <span className={urgencyClassName(item.urgency)}>{item.urgency}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {item.href ? (
                <Link
                  href={item.href as never}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Review context
                </Link>
              ) : null}
              {item.proposalId ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleSendToApproval(item.proposalId as string)}
                    disabled={handled || isMutating || !canReviewProposals}
                    className="gap-2"
                  >
                    {approveProposal.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Send to approval/workflow
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDismiss(item.proposalId as string)}
                    disabled={handled || isMutating || !canReviewProposals}
                    className="gap-2"
                  >
                    {rejectProposal.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Dismiss
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          );
        })}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
            No recommended actions match the current filter set.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function urgencyClassName(urgency: IntelligenceActionItem['urgency']) {
  if (urgency === 'Immediate') {
    return 'inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100';
  }

  if (urgency === 'Next') {
    return 'inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100';
  }

  return 'inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100';
}

function deriveActionReviewStatus(item: IntelligenceActionItem) {
  if (item.status) {
    return item.status;
  }

  if (item.executionStatus === 'PENDING_APPROVAL' || item.approvalRequestId) {
    return 'SENT_TO_APPROVAL' as const;
  }

  if (item.executionStatus === 'SUCCEEDED') {
    return item.actionType === 'CREATE_WORKFLOW_TASK'
      ? ('SENT_TO_WORKFLOW' as const)
      : ('EXECUTED' as const);
  }

  return 'PENDING' as const;
}

function formatDisplayStatus(status: NonNullable<IntelligenceActionItem['status']>) {
  if (status === 'SENT_TO_APPROVAL') return 'Sent to approval';
  if (status === 'SENT_TO_WORKFLOW') return 'Sent to workflow';
  if (status === 'DISMISSED') return 'Dismissed';
  if (status === 'EXECUTED') return 'Executed';
  return 'Pending review';
}

function statusClassName(status: NonNullable<IntelligenceActionItem['status']>) {
  return cn(
    'inline-flex rounded-full border px-3 py-1',
    status === 'PENDING' && 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    (status === 'SENT_TO_APPROVAL' || status === 'SENT_TO_WORKFLOW') &&
      'border-sky-500/30 bg-sky-500/10 text-sky-100',
    status === 'EXECUTED' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    status === 'DISMISSED' && 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  );
}
