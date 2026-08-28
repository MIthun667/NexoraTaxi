'use client';

import { Clock3, CreditCard, DatabaseZap, Store } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn, formatDateTime } from '@/lib/utils';
import { CommerceDataTrustStatus } from '@/types/shopify-intelligence';

export function CommerceDataTrustStrip({
  trust,
}: {
  trust: CommerceDataTrustStatus | null;
}) {
  const items: Array<{
    icon: typeof Store;
    label: string;
    value: string;
    tone: 'healthy' | 'limited' | 'issue' | 'neutral';
    detail: string;
  }> = [
    {
      icon: Store,
      label: 'System Status',
      value: humanizeTrustValue(trust?.overallStatus, {
        healthy: 'Healthy',
        limited: 'Limited',
        issue_detected: 'Issue Detected',
        not_connected: 'Not Connected',
      }),
      tone: toneFromTrustValue(trust?.overallStatus),
      detail: trust
        ? trust.recommendedOperatorMessage
        : 'Connect your store to enable insights.',
    },
    {
      icon: Clock3,
      label: 'Data Freshness',
      value: humanizeTrustValue(trust?.freshnessStatus, {
        up_to_date: 'Up to Date',
        delayed: 'Delayed',
        stale: 'Stale',
      }),
      tone: toneFromTrustValue(trust?.freshnessStatus),
      detail: trust?.integrations.shopify.lastSuccessfulSyncAt
        ? `Shopify last updated ${formatDateTime(trust.integrations.shopify.lastSuccessfulSyncAt)}.`
        : 'No successful Shopify sync has completed yet.',
    },
    {
      icon: DatabaseZap,
      label: 'Coverage',
      value: humanizeTrustValue(trust?.coverageStatus, {
        full: 'Full',
        partial: 'Partial',
        minimal: 'Minimal',
        unavailable: 'Unavailable',
      }),
      tone:
        trust?.coverageStatus === 'full'
          ? 'healthy'
          : trust?.coverageStatus === 'partial' || trust?.coverageStatus === 'minimal'
            ? 'limited'
            : 'issue',
      detail: describeCoverage(trust),
    },
    {
      icon: CreditCard,
      label: 'Payments Visibility',
      value: humanizeTrustValue(trust?.stripeStatus, {
        connected: 'Connected',
        delayed: 'Delayed',
        stale: 'Stale',
        failed: 'Issue Detected',
        not_connected: 'Unavailable',
        not_applicable: 'Not Applicable',
      }),
      tone: toneFromTrustValue(trust?.stripeStatus),
      detail: trust?.integrations.stripe.lastSuccessfulSyncAt
        ? `Payments last updated ${formatDateTime(trust.integrations.stripe.lastSuccessfulSyncAt)}.`
        : 'Payments visibility is unavailable until Stripe is connected.',
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <TrustTile
          key={item.label}
          icon={item.icon}
          label={item.label}
          value={item.value}
          detail={item.detail}
          tone={item.tone}
        />
      ))}
    </div>
  );
}

export function CommerceDataTrustPanel({
  trust,
  title = 'Data Status',
  description = 'Current source coverage, freshness, and visibility for the intelligence shown on this page.',
}: {
  trust: CommerceDataTrustStatus | null;
  title?: string;
  description?: string;
}) {
  if (!trust) {
    return null;
  }

  return (
    <SectionCard title={title} description={description} variant="subtle">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={humanizeTrustValue(trust.overallStatus, {
            healthy: 'healthy',
            limited: 'limited',
            issue_detected: 'issue',
            not_connected: 'issue',
          })} />
          <StatusBadge value={humanizeTrustValue(trust.freshnessStatus, {
            up_to_date: 'healthy',
            delayed: 'delayed',
            stale: 'stale',
          })} />
          <StatusBadge value={humanizeTrustValue(trust.coverageStatus, {
            full: 'healthy',
            partial: 'limited',
            minimal: 'limited',
            unavailable: 'issue',
          })} />
          <StatusBadge value={humanizeTrustValue(trust.stripeStatus, {
            connected: 'healthy',
            delayed: 'delayed',
            stale: 'stale',
            failed: 'issue',
            not_connected: 'limited',
            not_applicable: 'neutral',
          })} />
        </div>

        <p className="text-sm leading-6 text-slate-300">{trust.recommendedOperatorMessage}</p>

        <div className="grid gap-5 xl:grid-cols-2">
          <TrustList
            title="Evidence"
            emptyLabel="No trust evidence is available yet."
            items={trust.evidence}
          />
          <TrustList
            title="Limitations"
            emptyLabel="No current trust limitations are active."
            items={trust.limitations}
            muted
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <TrustStat
            label="Shopify"
            value={trust.integrations.shopify.shopDomain ?? 'Not connected'}
            subvalue={trust.integrations.shopify.lastSuccessfulSyncAt
              ? `Last successful sync ${formatDateTime(trust.integrations.shopify.lastSuccessfulSyncAt)}`
              : 'No successful Shopify sync recorded yet'}
          />
          <TrustStat
            label="Payments"
            value={trust.integrations.stripe.connected ? 'Connected' : 'Unavailable'}
            subvalue={trust.integrations.stripe.lastSuccessfulSyncAt
              ? `Last successful sync ${formatDateTime(trust.integrations.stripe.lastSuccessfulSyncAt)}`
              : 'Payments visibility is unavailable until Stripe is connected'}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function TrustTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  detail: string;
  tone: 'healthy' | 'limited' | 'issue' | 'neutral';
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.015] p-3 transition hover:bg-white/[0.03]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-slate-400 shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 truncate">{label}</p>
          </div>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] border',
              tone === 'healthy' && 'bg-emerald-500/5 text-emerald-400/90 border-emerald-500/10',
              tone === 'limited' && 'bg-amber-500/5 text-amber-400/90 border-amber-500/10',
              tone === 'issue' && 'bg-rose-500/5 text-rose-400/90 border-rose-500/10',
              tone === 'neutral' && 'bg-slate-500/5 text-slate-400/90 border-slate-500/10',
            )}
          >
            {tone === 'healthy'
              ? 'Healthy'
              : tone === 'limited'
                ? 'Limited'
                : tone === 'issue'
                  ? 'Issue'
                  : 'Neutral'}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-bold tracking-tight text-white">{value}</p>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function TrustList({
  title,
  items,
  emptyLabel,
  muted,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}-${item}`} className="flex gap-2">
              <span
                className={cn(
                  'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                  muted ? 'bg-amber-400/70' : 'bg-slate-400',
                )}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrustStat({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subvalue}</p>
    </div>
  );
}

function describeCoverage(trust: CommerceDataTrustStatus | null) {
  if (!trust) {
    return 'Connect your store to enable insights.';
  }

  if (trust.coverageStatus === 'full') {
    return 'Products, orders, and customers are available.';
  }

  if (trust.coverageStatus === 'partial') {
    return 'Some store data is available, but visibility is still partial.';
  }

  if (trust.coverageStatus === 'minimal') {
    return 'Only limited store coverage is available right now.';
  }

  return 'Coverage is unavailable until a store is connected.';
}

function toneFromTrustValue(value: string | undefined) {
  if (value === 'healthy' || value === 'connected' || value === 'up_to_date' || value === 'full') {
    return 'healthy' as const;
  }

  if (value === 'limited' || value === 'delayed' || value === 'partial' || value === 'minimal' || value === 'not_connected') {
    return 'limited' as const;
  }

  if (value === 'issue_detected' || value === 'failed' || value === 'stale' || value === 'unavailable') {
    return 'issue' as const;
  }

  return 'neutral' as const;
}

function humanizeTrustValue(value: string | undefined, mapping: Record<string, string>) {
  if (!value) {
    return 'Unknown';
  }

  return mapping[value] ?? value.replaceAll('_', ' ');
}
