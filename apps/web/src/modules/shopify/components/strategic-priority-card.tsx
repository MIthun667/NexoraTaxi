'use client';

import { StrategicPriority } from '@/types/shopify-intelligence';

import { StrategicLinkedArtifacts } from './strategic-linked-artifacts';

export function StrategicPriorityCard({
  priority,
  onStatusChange,
}: {
  priority: StrategicPriority;
  onStatusChange: (priority: StrategicPriority, status: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-100">{priority.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            {formatLabel(priority.category)} · {formatLabel(priority.urgency)}
          </p>
        </div>
        <select
          value={priority.status}
          onChange={(event) => onStatusChange(priority, event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          <option value="identified">Identified</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-slate-300">{priority.description}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Detail label="Owner" value={priority.owner ?? 'Unassigned'} />
        <Detail label="Target date" value={priority.targetDate ? formatDate(priority.targetDate) : 'Not set'} />
        <Detail label="Status" value={formatLabel(priority.status)} />
      </div>

      {priority.successCriteria.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Success criteria
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {priority.successCriteria.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <StrategicLinkedArtifacts
          signals={priority.linkedSignals}
          recommendations={priority.linkedRecommendations}
          proposals={priority.linkedProposals}
          scenarios={priority.linkedScenarios}
          executions={priority.linkedExecutions}
          agentRuns={priority.linkedAgentRuns}
          outcomeSummary={priority.linkedOutcomeSummary}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
