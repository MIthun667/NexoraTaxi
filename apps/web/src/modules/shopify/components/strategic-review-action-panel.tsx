'use client';

import { StrategicReviewActionReview } from '@/types/shopify-intelligence';

export function StrategicReviewActionPanel({
  review,
}: {
  review: StrategicReviewActionReview;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Approved" value={review.proposalsApproved} />
        <Metric label="Pending review" value={review.proposalsPending} />
        <Metric label="Failed executions" value={review.executionsFailed} />
      </div>
      <p className="text-sm text-slate-300">{review.summary}</p>
      {review.openRisks.length ? (
        <ul className="space-y-2 text-sm text-slate-400">
          {review.openRisks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
