import { Activity, ShieldAlert, Sparkles, Users } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatNumber } from '@/lib/utils';
import { CrmSegmentSummary } from '@/types/crm';

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'No recent mix';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomerSegmentSummary({
  summary,
}: {
  summary: CrmSegmentSummary;
}) {
  return (
    <SectionCard
      eyebrow="Customer intelligence"
      title="Customer mix and retention posture"
      description="A concise view of segment quality, revenue concentration, and repeat-customer strength."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="text-sm text-slate-400">Retention pressure</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {summary.summary.retentionPressure === 'HIGH'
                ? 'Urgent retention review'
                : summary.summary.retentionPressure === 'MEDIUM'
                  ? 'Watch repeat demand'
                  : 'Stable'}
            </p>
          </div>
          <StatusBadge value={summary.summary.retentionPressure} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SegmentMetric icon={Users} label="Total customers" value={summary.summary.totalCustomers} />
          <SegmentMetric icon={Sparkles} label="High-value" value={summary.summary.highValueCustomers} />
          <SegmentMetric icon={ShieldAlert} label="At-risk" value={summary.summary.atRiskCustomers} />
          <SegmentMetric icon={Activity} label="Dormant" value={summary.summary.dormantCustomers} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InfoTile
            label="Repeat customer share"
            value={formatPercent(summary.summary.repeatCustomerShareCurrent)}
            hint={`Previous window: ${formatPercent(summary.summary.repeatCustomerSharePrevious)}`}
          />
          <InfoTile
            label="Top customer revenue share"
            value={formatPercent(summary.summary.topCustomerRevenueShare)}
            hint="Top five customers as a share of tracked revenue"
          />
          <InfoTile
            label="High-value at risk"
            value={formatNumber(summary.summary.highValueAtRiskCustomers)}
            hint="Customers worth protecting first"
          />
        </div>
      </div>
    </SectionCard>
  );
}

function SegmentMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-[var(--brand-400)]" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{formatNumber(value)}</p>
    </div>
  );
}

function InfoTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
