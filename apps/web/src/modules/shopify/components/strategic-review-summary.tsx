'use client';

import { StrategicReviewReport } from '@/types/shopify-intelligence';

export function StrategicReviewSummary({
  review,
}: {
  review: StrategicReviewReport;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Strategic Review</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Weekly business review</h2>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p>{formatWindow(review.reviewWindow)}</p>
          <p>Generated {formatDateTime(review.generatedAt)}</p>
        </div>
      </div>
      <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">{review.summary}</p>
    </div>
  );
}

function formatWindow(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
