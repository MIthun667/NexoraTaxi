'use client';

import type { Route } from 'next';

import { Button } from '@/components/ui/button';
import { PortfolioOrganizationItem } from '@/types/shopify-intelligence';

export function PortfolioOrganizationCard({
  item,
  onOpenOrganization,
}: {
  item: PortfolioOrganizationItem;
  onOpenOrganization: (organizationId: string, href: Route) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100">{item.organizationName}</p>
          <div className="flex flex-wrap gap-2">
            <StatusPill label={formatStatus(item.overallStatus)} tone={statusTone(item.overallStatus)} />
            <StatusPill label={formatTrend(item.recentOutcomeTrend)} tone={trendTone(item.recentOutcomeTrend)} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onOpenOrganization(item.organizationId, '/shopify/executive-brief')}>
          Open executive view
        </Button>
      </div>
      <p className="mt-4 text-sm text-slate-300">{item.topSummary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Detail label="Top signal" value={item.topSignal?.title ?? 'No major signal detected'} />
        <Detail label="Top recommendation" value={item.topRecommendation?.title ?? 'No active recommendation'} />
        <Detail label="Pending actions" value={String(item.pendingActionCount)} />
        <Detail label="Critical signals" value={String(item.criticalSignalCount)} />
      </div>
      <div className="mt-4 rounded-xl border border-white/6 bg-black/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Store / Coverage Note
        </p>
        <p className="mt-1 text-sm text-slate-300">{item.connectedStoreSummary}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onOpenOrganization(item.organizationId, '/shopify/signals')}>
          Signals
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenOrganization(item.organizationId, '/shopify/action-proposals')}>
          Actions
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenOrganization(item.organizationId, '/shopify/outcomes')}>
          Outcomes
        </Button>
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

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>{label}</span>;
}

function statusTone(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-green-500/10 text-green-300';
    case 'limited':
      return 'bg-amber-500/10 text-amber-300';
    case 'issue_detected':
      return 'bg-red-500/10 text-red-300';
    case 'not_connected':
      return 'bg-slate-500/10 text-slate-300';
    default:
      return 'bg-slate-500/10 text-slate-300';
  }
}

function trendTone(trend: string) {
  switch (trend) {
    case 'improving':
      return 'bg-green-500/10 text-green-300';
    case 'weakening':
      return 'bg-red-500/10 text-red-300';
    case 'stable':
      return 'bg-slate-500/10 text-slate-300';
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function formatTrend(value: string) {
  return value === 'insufficient_data' ? 'Insufficient Data' : formatStatus(value);
}
