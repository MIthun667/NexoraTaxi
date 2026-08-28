'use client';

import { Button } from '@/components/ui/button';
import { StrategicPriorityCandidate } from '@/types/shopify-intelligence';

export function StrategicCandidatePriorities({
  items,
  onAdd,
  disabled,
  isPending,
}: {
  items: StrategicPriorityCandidate[];
  onAdd: (candidate: StrategicPriorityCandidate) => void;
  disabled: boolean;
  isPending: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        There is not enough recent operating activity to suggest strong strategic priorities yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.candidateKey} className="rounded-2xl border border-white/6 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {formatLabel(item.category)} · {formatLabel(item.urgency)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isPending}
              onClick={() => onAdd(item)}
            >
              {isPending ? 'Adding...' : 'Add Priority'}
            </Button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{item.description}</p>
          <p className="mt-3 text-sm text-slate-400">{item.rationale}</p>
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
