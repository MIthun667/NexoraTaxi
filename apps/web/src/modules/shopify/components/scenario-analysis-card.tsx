'use client';

import { SectionCard } from '@/components/layout/section-card';
import { ScenarioAnalysisResponse } from '@/types/shopify-intelligence';

import { ScenarioMitigationsList } from './scenario-mitigations-list';

export function ScenarioAnalysisCard({ analysis }: { analysis: ScenarioAnalysisResponse }) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Scenario Summary"
        description="A bounded directional analysis grounded in current trust, signals, actions, and outcomes."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip label={`Confidence: ${formatLabel(analysis.confidence)}`} />
            <StatusChip label={`Trust: ${formatLabel(analysis.trust.overallStatus)}`} />
            <StatusChip label={`Scenario: ${formatLabel(analysis.scenarioType)}`} />
          </div>
          <p className="max-w-3xl text-[15px] font-medium leading-relaxed text-slate-200">
            {analysis.summary}
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Expected Effects"
          description="Likely operational effects if the scenario continues or occurs."
          variant="subtle"
        >
          <BulletList items={analysis.expectedEffects} />
        </SectionCard>
        <SectionCard
          title="Key Risks"
          description="Leadership risks to keep visible while interpreting the scenario."
          variant="subtle"
        >
          <BulletList items={analysis.risks} colorClass="bg-rose-400/70" />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Recommended Mitigations"
          description="Grounded next steps drawn from current intelligence and governance flows."
        >
          <ScenarioMitigationsList items={analysis.recommendedMitigations} />
        </SectionCard>
        <SectionCard
          title="Assumptions and Limits"
          description="Directional assumptions and trust constraints behind this scenario."
          variant="subtle"
        >
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Input assumptions
              </p>
              <div className="mt-2">
                <BulletList items={analysis.inputAssumptions} colorClass="bg-slate-500/70" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Limitations
              </p>
              <div className="mt-2">
                <BulletList items={analysis.limitations} colorClass="bg-amber-400/70" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Follow-Up Questions"
        description="Useful executive follow-ups grounded in the current scenario result."
        variant="subtle"
      >
        <div className="flex flex-wrap gap-2">
          {analysis.followUps.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/6 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function BulletList({
  items,
  colorClass = 'bg-slate-400/70',
}: {
  items: string[];
  colorClass?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">No scenario details are available yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${colorClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/6 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
      {label}
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
