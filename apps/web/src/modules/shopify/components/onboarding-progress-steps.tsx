import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type StepState = 'completed' | 'current' | 'upcoming';

export function OnboardingProgressSteps({
  steps,
}: {
  steps: Array<{
    key: string;
    title: string;
    description: string;
    state: StepState;
  }>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.key}
          className={cn(
            'rounded-3xl border p-4',
            step.state === 'completed'
              ? 'border-emerald-500/25 bg-emerald-500/[0.08]'
              : step.state === 'current'
                ? 'border-[var(--brand-500)]/30 bg-[var(--brand-500)]/10'
                : 'border-white/10 bg-white/[0.03]',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'grid h-10 w-10 place-items-center rounded-2xl',
                step.state === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : step.state === 'current'
                    ? 'bg-[var(--brand-500)]/15 text-[var(--brand-300)]'
                    : 'bg-white/[0.06] text-slate-400',
              )}
            >
              {step.state === 'completed' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : step.state === 'current' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CircleDashed className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">{step.title}</p>
              <p className="text-sm text-slate-300">{step.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
