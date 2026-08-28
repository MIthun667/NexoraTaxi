import Link from 'next/link';
import { ArrowRight, CheckCircle2, Radar } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { ShopifyAiDailySummary } from '@/types/shopify-intelligence';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function OnboardingSuccessState({
  summary,
}: {
  summary: ShopifyAiDailySummary;
}) {
  return (
    <SectionCard
      eyebrow="Step 3"
      title="Intelligence is ready"
      description="Your Shopify data is now flowing into Nexora and the first business intelligence layer is live."
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.08] p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-white">{summary.summary}</p>
              <p className="text-sm text-slate-200">
                Revenue today: {formatCurrency(summary.metrics.totalRevenue)} · Orders: {summary.metrics.totalOrders} · New customers: {summary.metrics.newCustomers}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/shopify">
            <Button variant="default">
              <Radar className="mr-2 h-4 w-4" />
              Open Shopify dashboard
            </Button>
          </Link>
          <Link href="/ai/overview">
            <Button variant="outline">
              Explore AI Command Center
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}
