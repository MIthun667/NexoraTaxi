import { AlertCircle, BadgeDollarSign, ReceiptText, ShieldCheck, UserPlus } from 'lucide-react';

import { MetricCard } from '@/modules/shared/components/metric-card';

export function ShopifyKpiStrip({
  totalRevenue,
  totalOrders,
  newCustomers,
  highSeveritySignals,
  refundTelemetryAvailable,
}: {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  highSeveritySignals: number;
  refundTelemetryAvailable: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        title="Revenue today"
        value={Math.round(totalRevenue)}
        description="No verified revenue"
        icon={BadgeDollarSign}
      />
      <MetricCard
        title="Orders today"
        value={totalOrders}
        description="Verified order count"
        icon={ReceiptText}
      />
      <MetricCard
        title="New customers"
        value={newCustomers}
        description="New profiles today"
        icon={UserPlus}
      />
      <MetricCard
        title="High severity"
        value={highSeveritySignals}
        description="Immediate review"
        icon={AlertCircle}
      />
      <MetricCard
        title="Refunds"
        value={refundTelemetryAvailable ? 1 : 0}
        description={refundTelemetryAvailable ? 'Tracking active' : 'Tracking pending'}
        icon={ShieldCheck}
      />
    </div>
  );
}
