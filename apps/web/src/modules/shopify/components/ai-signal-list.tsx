'use client';

import { SectionCard } from '@/components/layout/section-card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn, formatEnumLabel } from '@/lib/utils';
import { ShopifyAiSignal } from '@/types/shopify-intelligence';

export function AiSignalList({
  signals,
  title = 'Signals',
  description = 'Material changes that need review, ranked by business impact and freshness.',
  emptyMessage = 'No significant signals detected.',
}: {
  signals: ShopifyAiSignal[];
  title?: string;
  description?: string;
  emptyMessage?: string;
}) {
  return (
    <SectionCard title={title} description={description} variant="subtle">
      {signals.length === 0 ? (
        <div className="px-1 py-2 text-sm text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <article
              key={signal.id}
              className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge value={signal.severity} />
                    <StatusBadge value={signal.freshnessStatus} />
                    <AreaBadge area={signal.affectedArea} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">{signal.title}</p>
                    <p className="text-sm text-slate-300">{signal.summary || signal.description}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{formatEnumLabel(signal.confidence)} confidence</p>
                  <p>{formatRelativeTime(signal.detectedAt)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Why It Matters
                  </p>
                  <p className="text-sm text-slate-400">{signal.reason}</p>
                  {signal.evidence.length > 0 ? (
                    <ul className="space-y-1.5 pt-1 text-sm text-slate-400">
                      {signal.evidence.slice(0, 3).map((item, index) => (
                        <li key={`${signal.id}-evidence-${index}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500/60" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Recommended Next Step
                  </p>
                  <p className="text-sm text-slate-300">{signal.recommendedNextStep}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AreaBadge({ area }: { area: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300',
      )}
    >
      {formatEnumLabel(area)}
    </span>
  );
}

function formatRelativeTime(value: string) {
  const detectedAt = new Date(value);
  const deltaMs = Date.now() - detectedAt.getTime();
  const hours = Math.floor(deltaMs / (1000 * 60 * 60));

  if (hours < 1) {
    return 'Updated within the last hour';
  }

  if (hours < 24) {
    return `Updated ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
