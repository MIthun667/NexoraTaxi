'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export type SystemMode = 'partial' | 'full' | 'empty';

export function SystemModeBanner({
  systemMode,
  accessGuideHref = '/shopify/onboarding',
  continueHref = '/shopify',
}: {
  systemMode: SystemMode;
  accessGuideHref?: string;
  continueHref?: string;
}) {
  if (systemMode !== 'partial') {
    return null;
  }

  return (
    <Card className="border-amber-400/25 bg-amber-500/[0.08] p-0 shadow-[0_20px_60px_rgba(120,53,15,0.18)]">
      <div className="flex flex-col gap-5 rounded-2xl border border-amber-300/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.08),rgba(250,204,21,0.08))] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300/14 text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
                AI Operating Mode
              </p>
              <h2 className="text-lg font-semibold text-white">Limited Intelligence Mode</h2>
              <p className="text-sm text-amber-50/85">
                Shopify connection is active, but full business intelligence is restricted.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ChecklistItem label="Products syncing" state="active" />
            <ChecklistItem label="Orders restricted" state="blocked" />
            <ChecklistItem label="Customers restricted" state="blocked" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={accessGuideHref as Route}>
            <Button variant="outline" className="border-amber-200/20 bg-amber-50/8 text-amber-50 hover:bg-amber-50/12">
              View access guide
            </Button>
          </Link>
          <Link href={continueHref as Route}>
            <Button className="bg-amber-300 text-slate-950 hover:bg-amber-200">
              Continue in limited mode
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function ChecklistItem({
  label,
  state,
}: {
  label: string;
  state: 'active' | 'blocked';
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-amber-200/15 bg-black/10 px-3 py-2 text-sm text-white">
      {state === 'active' ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      ) : (
        <XCircle className="h-4 w-4 text-rose-300" />
      )}
      <span>{label}</span>
    </div>
  );
}
