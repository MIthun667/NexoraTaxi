'use client';

import type { ReactNode } from 'react';

import { DetailSection } from '@/components/layout/detail-section';
import { SectionCard } from '@/components/layout/section-card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AgentRunDetail } from '@/types/ai';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';

export function DecisionViewer({ run }: { run: AgentRunDetail }) {
  const primaryDecision = run.decisions[0];
  const decisionMetadata =
    primaryDecision?.metadata && typeof primaryDecision.metadata === 'object'
      ? (primaryDecision.metadata as Record<string, unknown>)
      : null;
  const findings = readStringArray(decisionMetadata?.findings);
  const risks = readStringArray(decisionMetadata?.risks);
  const recommendations = readStringArray(decisionMetadata?.recommendations);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <SectionCard
          eyebrow="Agent run"
          title={run.agentName}
          description={run.summary ?? 'No summary was recorded for this run.'}
        >
          <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
            <Detail label="Run id" value={run.id} />
            <Detail label="Status" value={<StatusBadge value={run.status} />} />
            <Detail label="Trigger" value={run.triggerSource ?? run.triggerType} />
            <Detail label="Reason" value={run.triggerReason ?? 'Manual run'} />
            <Detail label="Target" value={`${run.entityType ?? 'n/a'} ${run.entityId ?? ''}`.trim()} />
            <Detail label="Started" value={formatDateTime(run.startedAt)} />
            <Detail label="Completed" value={run.completedAt ? formatDateTime(run.completedAt) : 'In progress'} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Input snapshot"
          title="Run context"
          description="The bounded context snapshot used by this run."
        >
          <div className="space-y-4 text-sm text-slate-300">
            <pre className="overflow-x-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-slate-300">
              {JSON.stringify(run.retrievalBundle?.entitySnapshot ?? run.inputContext ?? {}, null, 2)}
            </pre>
            {run.retrievalBundle?.contextNotes?.length ? (
              <ul className="space-y-2 text-slate-400">
                {run.retrievalBundle.contextNotes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Structured output"
          title="Observations, evidence, and guidance"
          description="Agent output normalized for operator review."
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <CompactList
                title="Findings"
                items={findings}
                emptyMessage="No findings were recorded for this run."
              />
              <CompactList
                title="Risks"
                items={risks}
                emptyMessage="No explicit risks were recorded for this run."
              />
              <CompactList
                title="Recommendations"
                items={recommendations}
                emptyMessage="No recommendations were recorded for this run."
              />
            </div>
            {run.decisions.map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{formatEnumLabel(decision.decisionType)}</p>
                  <SeverityBadge value={decision.confidence} />
                </div>
                <p className="mt-2 text-sm text-slate-300">{decision.summary}</p>
                {decision.metadata ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Recorded {formatDateTime(decision.createdAt)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <DetailSection title="Action proposals" description="Actions the agent recommended or executed.">
          <div className="space-y-3">
            {run.actionProposals.map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{formatEnumLabel(proposal.actionType)}</p>
                    <p className="mt-1 text-sm text-slate-400">{proposal.summary}</p>
                  </div>
                  <StatusBadge value={proposal.status} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {proposal.targetEntityType ?? 'no-target'} {proposal.targetEntityId ?? ''}
                </p>
                {proposal.executionSummary ? (
                  <p className="mt-3 text-sm text-slate-400">{proposal.executionSummary}</p>
                ) : null}
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Verification result" description="How the platform evaluated technical and business outcomes.">
          <div className="space-y-3">
            {run.verificationResults.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{item.verificationType}</p>
                  <StatusBadge value={item.verificationStatus} />
                </div>
                <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

function CompactList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {(items.length ? items : [emptyMessage]).slice(0, 3).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm text-slate-200">{value}</div>
    </div>
  );
}
