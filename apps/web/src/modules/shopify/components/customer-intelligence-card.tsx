import Link from 'next/link';
import { ArrowRight, ShieldAlert, Users } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatNumber } from '@/lib/utils';
import { CrmSegmentSummary } from '@/types/crm';

function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomerIntelligenceCard({
  segments,
  isLoading,
}: {
  segments: CrmSegmentSummary | null;
  isLoading?: boolean;
}) {
  return (
    <SectionCard
      eyebrow="Customers"
      title="Customers"
      variant="subtle"
      actions={
        <Link href="/shopify/customer-intelligence">
          <Button variant="outline" size="sm">
            Open Customers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
          ))}
        </div>
      ) : segments ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Retention</p>
              <StatusBadge value={segments.summary.retentionPressure} />
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">
              {segments.summary.retentionPressure === 'HIGH'
                ? 'High'
                : segments.summary.retentionPressure === 'MEDIUM'
                  ? 'Watch'
                  : 'Stable'}
            </p>
          </div>
          <Metric label="High-value" value={segments.summary.highValueCustomers} icon={Users} />
          <Metric label="At-risk" value={segments.summary.atRiskCustomers} icon={ShieldAlert} />
          <Metric label="Dormant" value={segments.summary.dormantCustomers} icon={Users} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
          Customer insight will appear after more synced activity is available.
        </div>
      )}
    </SectionCard>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-[var(--brand-400)]" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  );
}
