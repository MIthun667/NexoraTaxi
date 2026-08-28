'use client';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StrategicPlan } from '@/types/shopify-intelligence';

export function StrategicPlanSummary({
  plan,
  limitations,
  onCreatePlan,
}: {
  plan: StrategicPlan | null;
  limitations: string[];
  onCreatePlan: () => void;
}) {
  return (
    <SectionCard
      title="Strategic Plan"
      description="A bounded leadership planning layer grounded in current Nexora intelligence."
      actions={
        !plan ? (
          <Button variant="outline" size="sm" onClick={onCreatePlan}>
            Create Current Plan
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <p className="max-w-3xl text-[15px] font-medium leading-relaxed text-slate-200">
          {plan?.summary ?? 'Strategic priorities will appear as Nexora identifies meaningful patterns and actions.'}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryStat label="Planning window" value={formatLabel(plan?.planningWindow ?? 'current_cycle')} />
          <SummaryStat label="Status" value={formatLabel(plan?.status ?? 'draft')} />
          <SummaryStat label="Active priorities" value={String(plan?.priorities.length ?? 0)} />
        </div>
        {limitations.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-400">
            {limitations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionCard>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
