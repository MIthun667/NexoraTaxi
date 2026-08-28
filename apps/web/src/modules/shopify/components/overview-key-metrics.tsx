import { AlertCircle, BadgeDollarSign, ReceiptText, UserPlus } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { MetricCard } from '@/modules/shared/components/metric-card';

export function OverviewKeyMetrics({
  totalRevenue,
  totalOrders,
  newCustomers,
  highSeveritySignals,
}: {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  highSeveritySignals: number;
}) {
  return (
    <SectionCard
      eyebrow="Performance"
      title="Key Metrics"
      variant="plain"
      description="Today's verified operating totals from the current store data window."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue Today"
          value={Math.round(totalRevenue)}
          description="No verified prior-day comparison available yet"
          icon={BadgeDollarSign}
          compact
        />
        <MetricCard
          title="Orders Today"
          value={totalOrders}
          description="No verified prior-day comparison available yet"
          icon={ReceiptText}
          compact
        />
        <MetricCard
          title="New Customers"
          value={newCustomers}
          description="No verified 7-day comparison available yet"
          icon={UserPlus}
          compact
        />
        <MetricCard
          title="Critical Signals"
          value={highSeveritySignals}
          description="Items that require immediate review"
          icon={AlertCircle}
          compact
        />
      </div>
    </SectionCard>
  );
}
