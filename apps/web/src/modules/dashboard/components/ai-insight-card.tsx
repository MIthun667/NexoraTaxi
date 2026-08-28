'use client';

import { BrainCircuit, ShieldAlert, TriangleAlert } from 'lucide-react';

import { cn, formatNumber } from '@/lib/utils';

const toneStyles = {
  LOW: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  MEDIUM: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  HIGH: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  CRITICAL: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
} as const;

export function AiInsightCard({
  title,
  severity,
  summary,
  recommendation,
  value,
}: {
  title: string;
  severity: keyof typeof toneStyles;
  summary: string;
  recommendation: string;
  value?: number;
}) {
  const Icon = severity === 'CRITICAL' || severity === 'HIGH' ? TriangleAlert : severity === 'MEDIUM' ? ShieldAlert : BrainCircuit;

  return (
    <div className={cn('rounded-3xl border p-5', toneStyles[severity])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">AI insight</p>
          <h3 className="mt-2 text-base font-semibold">{title}</h3>
        </div>
        <Icon className="h-5 w-5 opacity-90" />
      </div>
      <p className="mt-3 text-sm leading-6">{summary}</p>
      {typeof value === 'number' ? (
        <p className="mt-3 text-2xl font-semibold">{formatNumber(value)}</p>
      ) : null}
      <p className="mt-4 text-sm opacity-90">
        <span className="font-medium">Suggested action:</span> {recommendation}
      </p>
    </div>
  );
}
