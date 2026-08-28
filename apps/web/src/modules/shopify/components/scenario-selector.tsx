'use client';

import { cn } from '@/lib/utils';

type ScenarioOption = {
  type: string;
  title: string;
  description: string;
};

export function ScenarioSelector({
  options,
  selectedType,
  onSelect,
}: {
  options: ScenarioOption[];
  selectedType: string | null;
  onSelect: (scenarioType: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const active = option.type === selectedType;

        return (
          <button
            key={option.type}
            type="button"
            onClick={() => onSelect(option.type)}
            className={cn(
              'rounded-2xl border px-4 py-4 text-left transition',
              active
                ? 'border-slate-200/20 bg-white/[0.06]'
                : 'border-white/6 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]',
            )}
          >
            <p className="text-sm font-medium text-slate-100">{option.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
