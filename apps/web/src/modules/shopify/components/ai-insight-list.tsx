import { SectionCard } from '@/components/layout/section-card';
import { ShopifyAiInsight } from '@/types/shopify-intelligence';

export function AiInsightList({
  insights,
  highSeveritySignals,
}: {
  insights: ShopifyAiInsight[];
  highSeveritySignals: number;
}) {
  const riskState = highSeveritySignals > 0 ? 'Active' : 'Stable';
  const coverage = insights.length > 0 ? 'Partial' : 'Awaiting';

  return (
    <SectionCard
      eyebrow="Insights"
      title="Insights"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk posture</p>
          <p className="mt-2 text-2xl font-semibold text-white">{riskState}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">High severity</p>
          <p className="mt-2 text-2xl font-semibold text-white">{highSeveritySignals}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage</p>
          <p className="mt-2 text-2xl font-semibold text-white">{coverage}</p>
        </div>
      </div>
    </SectionCard>
  );
}
