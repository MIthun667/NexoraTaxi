'use client';

import Link from 'next/link';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { formatEnumLabel } from '@/lib/utils';
import { ExecutiveCopilotAgentHighlight } from '@/types/shopify-intelligence';

export function ExecutiveAgentHighlights({
  items,
}: {
  items: ExecutiveCopilotAgentHighlight[];
}) {
  return (
    <SectionCard
      title="Agent Highlights"
      description="Recent governed agent runs that surfaced meaningful leadership context."
      variant="subtle"
      actions={
        <Link href="/ai/runs">
          <Button variant="outline" size="sm">View agent runs</Button>
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">No governed agent highlights are available yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.runId} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{item.agentName}</p>
                  <p className="text-sm text-slate-300">{item.summary}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{formatEnumLabel(item.triggerType)}</p>
                  <p>{formatRelativeTime(item.startedAt)}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trigger Reason</p>
                  <p className="mt-1 text-sm text-slate-400">{item.triggerReason ?? 'Triggered from the governed runtime.'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Top Concern</p>
                  <p className="mt-1 text-sm text-slate-400">{item.topConcern ?? 'No additional concern was recorded for this run.'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value);
  const deltaMs = Date.now() - createdAt.getTime();
  const hours = Math.floor(deltaMs / (1000 * 60 * 60));

  if (hours < 1) {
    return 'Ran within the last hour';
  }

  if (hours < 24) {
    return `Ran ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Ran ${days}d ago`;
}
