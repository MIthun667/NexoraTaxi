'use client';

import Link from 'next/link';
import type { Route } from 'next';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { ExecutiveCopilotPendingAction } from '@/types/shopify-intelligence';

import { ProposalStatusBadge } from './proposal-status-badge';

export function ExecutiveActionsPanel({
  actions,
}: {
  actions: ExecutiveCopilotPendingAction[];
}) {
  return (
    <SectionCard
      title="Pending Actions"
      description="Bounded proposals and execution follow-ups that need review."
      variant="subtle"
      actions={
        <Link href="/shopify/action-proposals">
          <Button variant="outline" size="sm">Review actions</Button>
        </Link>
      }
    >
      {actions.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">No major issues require leadership attention right now.</p>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <article key={`${action.kind}-${action.id}`} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProposalStatusBadge status={action.status} />
                    <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                      {action.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{action.title}</p>
                  <p className="text-sm text-slate-400">{action.summary}</p>
                </div>
                <Link href={action.href as Route}>
                  <Button variant="ghost" size="sm">Open</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
