'use client';

import type { Route } from 'next';
import Link from 'next/link';

import {
  StrategicArtifactLink,
  StrategicOutcomeSummary,
  StrategicScenarioLink,
} from '@/types/shopify-intelligence';

export function StrategicLinkedArtifacts({
  signals,
  recommendations,
  proposals,
  scenarios,
  executions,
  agentRuns,
  outcomeSummary,
}: {
  signals: StrategicArtifactLink[];
  recommendations: StrategicArtifactLink[];
  proposals: StrategicArtifactLink[];
  scenarios: StrategicScenarioLink[];
  executions: StrategicArtifactLink[];
  agentRuns: StrategicArtifactLink[];
  outcomeSummary: StrategicOutcomeSummary | null;
}) {
  return (
    <div className="space-y-4">
      <ArtifactGroup title="Signals" items={signals} />
      <ArtifactGroup title="Recommendations" items={recommendations} />
      <ArtifactGroup title="Proposals" items={proposals} />
      <ArtifactGroup title="Scenarios" items={scenarios} />
      <ArtifactGroup title="Executions" items={executions} />
      <ArtifactGroup title="Agent Runs" items={agentRuns} />
      {outcomeSummary ? (
        <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Outcome Pattern
          </p>
          <p className="mt-1 text-sm text-slate-300">{outcomeSummary.summary}</p>
          <p className="mt-2 text-xs text-slate-400">
            Trend: {formatLabel(outcomeSummary.trend)}. Positive outcome rate:{' '}
            {Math.round(outcomeSummary.positiveOutcomeRate * 100)}%
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactGroup({
  title,
  items,
}: {
  title: string;
  items: Array<StrategicArtifactLink | StrategicScenarioLink>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {items.slice(0, 2).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
            {'href' in item ? (
              <Link href={item.href as Route} className="text-sm font-medium text-slate-100 hover:text-white">
                {item.title}
              </Link>
            ) : (
              <p className="text-sm font-medium text-slate-100">{item.title}</p>
            )}
            {item.detail ? <p className="mt-1 text-sm text-slate-400">{item.detail}</p> : null}
            {'status' in item && item.status ? (
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{formatLabel(item.status)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
