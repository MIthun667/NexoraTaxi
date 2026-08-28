'use client';

import { SectionCard } from '@/components/layout/section-card';
import { ShopifyAiWeeklyDigest } from '@/types/shopify-intelligence';

export function WeeklyReportHistoryList({ digests }: { digests: ShopifyAiWeeklyDigest[] }) {
  return (
    <SectionCard
      eyebrow="History"
      title="Recent weekly digests"
      variant="subtle"
      description="Past weekly reporting snapshots retained for continuity and executive review."
    >
      <div className="space-y-3">
        {digests.length === 0 ? (
          <div className="px-1 py-2 text-sm text-slate-400">
            Weekly digest history will appear after the first report is generated.
          </div>
        ) : (
          digests.map((digest) => (
            <div key={digest.id} className="rounded-xl bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">
                  {formatShortDate(digest.weekStartDate)} - {formatShortDate(digest.weekEndDate)}
                </p>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{digest.sourceType}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">{digest.summary}</p>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
