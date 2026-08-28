'use client';

import { StrategicReviewOutcomeReview } from '@/types/shopify-intelligence';

export function StrategicReviewOutcomePanel({
  review,
}: {
  review: StrategicReviewOutcomeReview;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Positive" value={review.positive} />
        <Metric label="Negative" value={review.negative} />
        <Metric label="Neutral" value={review.neutral} />
        <Metric label="Positive rate" value={`${Math.round(review.positiveOutcomeRate * 100)}%`} />
      </div>
      <p className="text-sm text-slate-300">{review.summary}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
        Learning trend · {formatLabel(review.learningTrend)}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
