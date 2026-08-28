'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { cn, formatEnumLabel } from '@/lib/utils';
import { ShopifyActionProposal } from '@/types/shopify-intelligence';

import { ProposalStatusBadge } from './proposal-status-badge';

export function ActionProposalList({ proposals }: { proposals: ShopifyActionProposal[] }) {
  return (
    <SectionCard
      eyebrow="Actions"
      title="Action Queue"
      actions={
        <Link href="/shopify/action-proposals">
          <Button variant="outline" size="sm">
            Review actions
          </Button>
        </Link>
      }
    >
      <div className="space-y-3">
        {proposals.length === 0 ? (
          <p className="px-1 py-2 text-sm text-slate-400">No review actions are needed right now.</p>
        ) : null}
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className={cn(
              'rounded-2xl border p-4',
              proposal.riskLevel === 'high'
                ? 'border-rose-500/10 bg-white/[0.02]'
                : proposal.riskLevel === 'medium'
                  ? 'border-amber-500/10 bg-white/[0.02]'
                  : 'border-white/6 bg-white/[0.02]',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ProposalStatusBadge status={proposal.status} />
                  {proposal.riskLevel ? (
                    <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                      {proposal.riskLevel} risk
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-slate-100">{proposal.title}</p>
                <p className="text-sm text-slate-400">{proposal.summary ?? proposal.description}</p>
                <p className="text-xs text-slate-500">{formatEnumLabel(proposal.type ?? proposal.proposalType)}</p>
              </div>

              <ClipboardList className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
