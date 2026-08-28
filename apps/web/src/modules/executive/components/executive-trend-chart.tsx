'use client';

import { SectionCard } from '@/components/layout/section-card';
import { formatNumber } from '@/lib/utils';
import { ExecutiveTrendSeries } from '@/types/executive';

export function ExecutiveTrendChart({
  series,
  dateLabel = '30-day view',
}: {
  series: ExecutiveTrendSeries;
  dateLabel?: string;
}) {
  const max = Math.max(...series.points.map((point) => point.value), 1);

  return (
    <SectionCard eyebrow={dateLabel} title={series.title} description={series.description}>
      <div className="space-y-4">
        {series.points.map((point) => (
          <div key={`${series.key}-${point.label}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">{point.label}</span>
              <span className="font-medium text-white">{formatNumber(point.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.9),rgba(14,165,233,0.8))]"
                style={{ width: `${Math.max((point.value / max) * 100, point.value > 0 ? 8 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
