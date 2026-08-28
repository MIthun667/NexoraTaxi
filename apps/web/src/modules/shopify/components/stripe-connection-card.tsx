'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/utils';
import { StripeConnectionStatus } from '@/types/stripe';

export function StripeConnectionCard({
  status,
  canManage,
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  status: StripeConnectionStatus | null;
  canManage: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (secretKey: string) => void;
}) {
  const [secretKey, setSecretKey] = useState('');

  return (
    <SectionCard
      eyebrow="Finance"
      title={status?.connected ? 'Stripe connected' : 'Connect Stripe'}
      description={status?.connected ? 'Payment visibility is active.' : 'Unlock payments, refunds, and confirmed revenue.'}
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {status?.account?.stripeAccountId ?? 'No Stripe account connected'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {status?.account?.accountEmail ?? 'No Stripe account connected yet.'}
              </p>
            </div>
            <StatusBadge value={status?.connected ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          {status?.account?.connectedAt ? (
            <p className="mt-3 text-xs text-slate-500">
              Connected {formatDateTime(status.account.connectedAt)}
            </p>
          ) : null}
        </div>

        {!status?.connected ? (
          <>
            {canManage ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="stripeSecretKey" className="text-sm font-medium text-white">
                    Stripe secret key
                  </label>
                  <Input
                    id="stripeSecretKey"
                    type="password"
                    value={secretKey}
                    onChange={(event) => setSecretKey(event.target.value)}
                    placeholder="sk_live_... or sk_test_..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
                </div>

                <Button onClick={() => onSubmit(secretKey)} disabled={!secretKey.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Connecting Stripe...' : 'Connect Stripe'}
                </Button>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
                Manager access required.
              </div>
            )}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
