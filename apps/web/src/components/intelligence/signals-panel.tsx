'use client';

import { AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';

export type ConsolidatedSignal = {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
};

export function SignalsPanel({
  signals,
}: {
  signals: ConsolidatedSignal[];
}) {
  return (
    <SectionCard
      eyebrow="Signals"
      title="Consolidated signals"
      description="A grouped signal feed that reduces duplication and keeps operators focused on the few gaps that matter."
    >
      {signals.length ? (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={`${signal.severity}-${signal.title}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl ${iconBg(signal.severity)}`}>
                  {signal.severity === 'high' ? (
                    <AlertTriangle className="h-4 w-4 text-rose-200" />
                  ) : signal.severity === 'medium' ? (
                    <ShieldAlert className="h-4 w-4 text-amber-100" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-emerald-100" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{signal.title}</p>
                  <p className="text-sm text-slate-400">{signal.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
          Awaiting data connection
        </p>
      )}
    </SectionCard>
  );
}

function iconBg(severity: ConsolidatedSignal['severity']) {
  if (severity === 'high') {
    return 'bg-rose-500/15';
  }

  if (severity === 'medium') {
    return 'bg-amber-400/20';
  }

  return 'bg-emerald-500/15';
}
