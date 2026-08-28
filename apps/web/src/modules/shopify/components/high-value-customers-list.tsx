import { Crown } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';
import { CrmCustomerProfile } from '@/types/crm';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function HighValueCustomersList({
  customers,
}: {
  customers: CrmCustomerProfile[];
}) {
  return (
    <SectionCard
      eyebrow="High-value customers"
      title="Customers worth protecting first"
      description="The strongest revenue contributors in the current customer base."
    >
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
          No high-value customers have been identified yet.
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
              || customer.email
              || 'Unnamed customer';

            return (
              <div key={customer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {customer.email ?? 'No email available'}
                    </p>
                  </div>
                  <Crown className="h-4 w-4 text-[var(--brand-400)]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
                  <span>Revenue {formatCurrency(Number(customer.totalRevenue ?? 0))}</span>
                  <span>Orders {customer.totalOrders}</span>
                  <span>Stage {formatEnumLabel(customer.lifecycleStage ?? 'ACTIVE')}</span>
                </div>
                {customer.lastOrderAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Last order {formatDateTime(customer.lastOrderAt)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
