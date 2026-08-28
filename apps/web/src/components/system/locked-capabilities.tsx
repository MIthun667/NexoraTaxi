'use client';

import { Lock } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';

const LOCKED_CAPABILITIES = [
  'Revenue analytics',
  'Customer segmentation',
  'Retention prediction',
] as const;

export function LockedCapabilities({
  isLocked,
}: {
  isLocked: boolean;
}) {
  return (
    <SectionCard
      eyebrow="Capability state"
      title="Locked capabilities"
      description={
        isLocked
          ? 'Advanced commerce intelligence remains intentionally locked until broader Shopify coverage is available.'
          : 'Core commerce intelligence capabilities are available for this tenant.'
      }
    >
      {isLocked ? (
        <div className="grid gap-3 md:grid-cols-3">
          {LOCKED_CAPABILITIES.map((item) => (
            <div
              key={item}
              title="Requires Shopify protected data access"
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200"
            >
              <Lock className="h-4 w-4 text-amber-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-4 text-sm text-emerald-100">
          Revenue analytics, customer segmentation, and retention prediction are available.
        </div>
      )}
    </SectionCard>
  );
}
