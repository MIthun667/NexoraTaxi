import { cn } from '@/lib/utils';

const toneMap: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-300',
  AVAILABLE: 'bg-emerald-500/10 text-emerald-300',
  COMPLIANT: 'bg-emerald-500/10 text-emerald-300',
  COMPLETED: 'bg-emerald-500/10 text-emerald-300',
  HEALTHY: 'bg-emerald-500/10 text-emerald-300',
  FRESH: 'bg-emerald-500/10 text-emerald-300',
  PENDING: 'bg-amber-500/10 text-amber-300',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-300',
  LIMITED: 'bg-amber-500/10 text-amber-300',
  DELAYED: 'bg-amber-500/10 text-amber-300',
  SUSPENDED: 'bg-rose-500/10 text-rose-300',
  NON_COMPLIANT: 'bg-rose-500/10 text-rose-300',
  EXPIRED: 'bg-rose-500/10 text-rose-300',
  OUT_OF_SERVICE: 'bg-rose-500/10 text-rose-300',
  LOCKED: 'bg-rose-500/10 text-rose-300',
  ISSUE: 'bg-rose-500/10 text-rose-300',
  STALE: 'bg-rose-500/10 text-rose-300',
  INACTIVE: 'bg-slate-500/10 text-slate-300',
  NEUTRAL: 'bg-slate-500/10 text-slate-300',
  healthy: 'bg-emerald-500/10 text-emerald-300',
  fresh: 'bg-emerald-500/10 text-emerald-300',
  limited: 'bg-amber-500/10 text-amber-300',
  delayed: 'bg-amber-500/10 text-amber-300',
  issue: 'bg-rose-500/10 text-rose-300',
  stale: 'bg-rose-500/10 text-rose-300',
  neutral: 'bg-slate-500/10 text-slate-300',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]',
        toneMap[value] ?? 'bg-slate-500/10 text-slate-300',
      )}
    >
      {value.replaceAll('_', ' ')}
    </span>
  );
}
