'use client';

import { ArrowRight, Loader2, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn, formatEnumLabel } from '@/lib/utils';
import { ShopifyAiRecommendation } from '@/types/shopify-intelligence';

export function AiRecommendationList({
  recommendations,
  isGenerating,
  isSubmitting,
  onGenerate,
  onCreateProposal,
  canManage,
  title = 'Opportunities',
  description = 'Advisory guidance grounded in current signals, visibility, and commerce performance.',
  emptyMessage = 'No high-priority recommendations are active right now.',
}: {
  recommendations: ShopifyAiRecommendation[];
  isGenerating?: boolean;
  isSubmitting?: boolean;
  onGenerate?: () => void;
  onCreateProposal?: (recommendationId: string) => void;
  canManage?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      variant="subtle"
      actions={canManage && onGenerate ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={!canManage || isGenerating}
        >
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Refresh opportunities
        </Button>
      ) : null}
    >
      {recommendations.length === 0 ? (
        <div className="px-1 py-2 text-sm text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.id}
              className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <UrgencyBadge urgency={recommendation.urgency} />
                    <AreaBadge area={recommendation.affectedArea} />
                    <StatusBadge value={recommendation.confidence} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">{recommendation.title}</p>
                    <p className="text-sm text-slate-300">
                      {recommendation.summary || recommendation.description}
                    </p>
                  </div>
                </div>
                {canManage && onCreateProposal ? (
                  <Button
                    size="sm"
                    onClick={() => onCreateProposal?.(recommendation.id)}
                    disabled={!canManage || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Create action
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Why This Is Recommended
                  </p>
                  <p className="text-sm text-slate-400">{recommendation.rationale}</p>
                  {recommendation.evidence.length > 0 ? (
                    <ul className="space-y-1.5 pt-1 text-sm text-slate-400">
                      {recommendation.evidence.slice(0, 3).map((item, index) => (
                        <li key={`${recommendation.id}-evidence-${index}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500/60" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Expected Outcome
                  </p>
                  <p className="text-sm text-slate-300">{recommendation.expectedOutcome}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]',
        urgency === 'high'
          ? 'bg-rose-500/10 text-rose-300'
          : urgency === 'medium'
            ? 'bg-amber-500/10 text-amber-300'
            : 'bg-slate-500/10 text-slate-300',
      )}
    >
      {urgency}
    </span>
  );
}

function AreaBadge({ area }: { area: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
      {formatEnumLabel(area)}
    </span>
  );
}
