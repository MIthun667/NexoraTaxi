'use client';

import { SectionCard } from '@/components/layout/section-card';
import { PortfolioExecutiveResponse } from '@/types/shopify-intelligence';

export function PortfolioRollupStrip({
  trustRollup,
  actionRollup,
  outcomeRollup,
}: Pick<PortfolioExecutiveResponse, 'trustRollup' | 'actionRollup' | 'outcomeRollup'>) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <SectionCard title="Trust Rollup" description="How current and trustworthy the portfolio is right now." variant="subtle">
        <RollupGrid
          items={[
            ['Healthy', trustRollup.healthy],
            ['Limited', trustRollup.limited],
            ['Issues', trustRollup.issueDetected],
            ['Not Connected', trustRollup.notConnected],
          ]}
        />
      </SectionCard>
      <SectionCard title="Action Rollup" description="Where leadership review or operational follow-up is concentrated." variant="subtle">
        <RollupGrid
          items={[
            ['Pending proposals', actionRollup.totalPendingProposals],
            ['Pending approvals', actionRollup.totalPendingApprovals],
            ['Failed executions', actionRollup.failedExecutionsNeedingAttention],
          ]}
        />
      </SectionCard>
      <SectionCard title="Outcome Rollup" description="Whether outcome quality is improving or weakening across the portfolio." variant="subtle">
        <RollupGrid
          items={[
            ['Improving', outcomeRollup.improving],
            ['Stable', outcomeRollup.stable],
            ['Weakening', outcomeRollup.weakening],
            ['Insufficient data', outcomeRollup.insufficientData],
          ]}
        />
      </SectionCard>
    </div>
  );
}

function RollupGrid({ items }: { items: Array<[string, number]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
        </div>
      ))}
    </div>
  );
}
