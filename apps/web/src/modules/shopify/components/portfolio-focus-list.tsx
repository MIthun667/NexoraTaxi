'use client';

import type { Route } from 'next';

import { SectionCard } from '@/components/layout/section-card';
import { PortfolioExecutiveResponse } from '@/types/shopify-intelligence';

export function PortfolioFocusList({
  items,
  onOpenOrganization,
}: {
  items: PortfolioExecutiveResponse['focusList'];
  onOpenOrganization: (organizationId: string, href: Route) => void;
}) {
  return (
    <SectionCard
      title="Leadership Focus"
      description="The most important cross-org items to review first."
      variant="subtle"
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No major issues require leadership attention right now.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={`${item.organizationId}-${item.title}`}
              type="button"
              onClick={() => onOpenOrganization(item.organizationId, item.href as Route)}
              className="w-full rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {item.organizationName}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    item.priority === 'high'
                      ? 'bg-red-500/10 text-red-300'
                      : 'bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {item.priority}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{item.reason}</p>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
