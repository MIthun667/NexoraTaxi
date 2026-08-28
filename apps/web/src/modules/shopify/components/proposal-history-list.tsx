import { SectionCard } from '@/components/layout/section-card';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';
import { ShopifyActionProposal } from '@/types/shopify-intelligence';

import { ProposalStatusBadge } from './proposal-status-badge';

export function ProposalHistoryList({ proposals }: { proposals: ShopifyActionProposal[] }) {
  return (
    <SectionCard
      eyebrow="Decision history"
      title="Reviewed proposals"
      description="A clear audit trail of who reviewed a proposal and how the decision landed."
    >
      {proposals.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">No proposal decisions have been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProposalStatusBadge status={proposal.status} />
                    <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                      {formatEnumLabel(proposal.priority)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{proposal.title}</p>
                  <p className="text-sm leading-6 text-slate-300">{proposal.summary ?? proposal.description}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  {proposal.reviewedAt ? formatDateTime(proposal.reviewedAt) : formatDateTime(proposal.updatedAt)}
                </p>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                <p>Reviewer {proposal.reviewedByUserId ?? 'Unknown'}</p>
                <p>Decision note {proposal.latestDecisionNote ?? 'No decision note recorded'}</p>
              </div>

              {proposal.reviews?.length ? (
                <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.02] p-3">
                  {proposal.reviews.map((review) => (
                    <div key={review.id} className="text-sm text-slate-300">
                      <span className="font-medium text-white">{formatEnumLabel(review.decision)}</span>{' '}
                      by {review.reviewerUserId} on {formatDateTime(review.createdAt)}
                      {review.note ? ` — ${review.note}` : ''}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
