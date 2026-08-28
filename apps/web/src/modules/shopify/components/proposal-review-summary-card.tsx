'use client';

import { SectionCard } from '@/components/layout/section-card';
import { ShopifyAiWeeklyDigest } from '@/types/shopify-intelligence';

export function ProposalReviewSummaryCard({ digest }: { digest: ShopifyAiWeeklyDigest }) {
  const governance = digest.metrics.governance;

  return (
    <SectionCard
      eyebrow="Actions"
      title="Action review summary"
      variant="subtle"
      description="A weekly view of action proposals, review throughput, and governance backlog."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Proposals created" value={governance.proposalsCreated} />
        <SummaryRow label="Reviews completed" value={governance.reviewsCompleted} />
        <SummaryRow label="Approved" value={governance.proposalsApproved} />
        <SummaryRow label="Rejected" value={governance.proposalsRejected} />
        <SummaryRow label="Needs revision" value={governance.proposalsNeedsRevision} />
        <SummaryRow label="Pending review" value={governance.proposalsPending} />
      </div>
    </SectionCard>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
