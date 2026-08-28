'use client';

import { ShopifyAiWeeklyDigest } from '@/types/shopify-intelligence';

export function WeeklyMetricsStrip({ digest }: { digest: ShopifyAiWeeklyDigest }) {
  const items = [
    {
      label: 'Revenue delta',
      value: formatPercent(digest.metrics.commerce.revenueDelta),
    },
    {
      label: 'Order delta',
      value: formatPercent(digest.metrics.commerce.orderDelta),
    },
    {
      label: 'Failed payments',
      value: String(digest.metrics.finance.failedPaymentsCurrent),
    },
    {
      label: 'At-risk customers',
      value: String(digest.metrics.customer.atRiskCustomers),
    },
    {
      label: 'Pending proposals',
      value: String(digest.metrics.governance.proposalsPending),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(0)}%`;
}
