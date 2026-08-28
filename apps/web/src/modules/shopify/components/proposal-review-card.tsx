'use client';

import { useState } from 'react';
import { CheckCircle2, Clock3, Send, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDateTime, formatEnumLabel } from '@/lib/utils';
import { ShopifyActionProposal } from '@/types/shopify-intelligence';

import { ProposalStatusBadge } from './proposal-status-badge';

export function ProposalReviewCard({
  proposal,
  canSubmit,
  canReview,
  isSubmitting,
  isReviewing,
  onSubmitForReview,
  onApprove,
  onReject,
  onDefer,
}: {
  proposal: ShopifyActionProposal;
  canSubmit: boolean;
  canReview: boolean;
  isSubmitting?: boolean;
  isReviewing?: boolean;
  onSubmitForReview: (note?: string) => void;
  onApprove: (note?: string) => void;
  onReject: (note?: string) => void;
  onDefer: (note?: string) => void;
}) {
  const [note, setNote] = useState(proposal.latestDecisionNote ?? '');
  const isPending = proposal.status === 'PENDING';
  const isReviewReady = proposal.status === 'IN_REVIEW' || proposal.status === 'NEEDS_REVISION' || proposal.status === 'PENDING';

  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        proposal.riskLevel === 'high'
          ? 'border-rose-500/10 bg-white/[0.02]'
          : proposal.riskLevel === 'medium'
            ? 'border-amber-500/10 bg-white/[0.02]'
            : 'border-white/6 bg-white/[0.02]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProposalStatusBadge status={proposal.status} />
            <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
              {formatEnumLabel(proposal.priority)}
            </span>
            {proposal.riskLevel ? (
              <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                {proposal.riskLevel} risk
              </span>
            ) : null}
            <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
              {formatEnumLabel(proposal.type ?? proposal.proposalType)}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-100">{proposal.title}</p>
            <p className="text-sm leading-6 text-slate-300">{proposal.summary ?? proposal.description}</p>
            <p className="text-sm text-slate-400">{proposal.reason ?? proposal.description}</p>
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
          {formatDateTime(proposal.createdAt)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <p>Affects {formatEnumLabel(proposal.targetEntityType ?? 'organization')}</p>
        <p>Recommended by {formatEnumLabel(proposal.recommendedBy ?? proposal.source)}</p>
        <p>Reviewed by {proposal.reviewedByUserId ?? 'Not reviewed yet'}</p>
        <p>Reviewed at {proposal.reviewedAt ? formatDateTime(proposal.reviewedAt) : 'Pending'}</p>
      </div>

      {proposal.evidence?.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-100">Evidence</p>
          <ul className="space-y-2 text-sm text-slate-300">
            {proposal.evidence.map((item, index) => (
              <li key={`${proposal.id}-evidence-${index}`} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposal.safetyNotes?.length ? (
        <div className="mt-4 rounded-xl bg-slate-500/10 px-4 py-3 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2 text-slate-200">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">Safety notes</span>
          </div>
          <ul className="space-y-2">
            {proposal.safetyNotes.map((item, index) => (
              <li key={`${proposal.id}-safety-${index}`} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add reviewer context, rationale, or a decision note..."
          className="min-h-[96px]"
          disabled={!canSubmit && !canReview}
        />

        <div className="flex flex-wrap gap-3">
          {isPending ? (
            <Button
              variant="outline"
              onClick={() => onSubmitForReview(note || undefined)}
              disabled={!canSubmit || isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit for review'}
              </Button>
            ) : null}

          {isReviewReady ? (
            <>
              <Button
                onClick={() => onApprove(note || undefined)}
                disabled={!canReview || isReviewing}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isReviewing ? 'Saving...' : 'Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onDefer(note || undefined)}
                disabled={!canReview || isReviewing}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Defer
              </Button>
              <Button
                variant="ghost"
                onClick={() => onReject(note || undefined)}
                disabled={!canReview || isReviewing}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
