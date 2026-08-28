'use client';

import Link from 'next/link';
import type { Route } from 'next';

import { StrategicReviewPriorityProgressItem } from '@/types/shopify-intelligence';

export function PriorityProgressList({
  items,
}: {
  items: StrategicReviewPriorityProgressItem[];
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-400">No linked priority progress is available yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.priorityId} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {formatLabel(item.status)} · {formatLabel(item.progressState)}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass(item.progressState)}`}>
              {formatLabel(item.progressState)}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300">{item.nextStep}</p>
          {item.linkedEvidence.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.linkedEvidence.map((evidence) => (
                <Link
                  key={evidence.id}
                  href={evidence.href as Route}
                  className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
                >
                  {evidence.title}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function badgeClass(value: string) {
  switch (value) {
    case 'improving':
      return 'bg-emerald-500/15 text-emerald-200';
    case 'blocked':
    case 'weakening':
      return 'bg-rose-500/15 text-rose-200';
    case 'insufficient_data':
      return 'bg-slate-500/15 text-slate-300';
    default:
      return 'bg-amber-500/15 text-amber-200';
  }
}
