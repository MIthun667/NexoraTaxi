import { cn, formatEnumLabel } from '@/lib/utils';

const toneMap: Record<string, string> = {
  LOW: 'bg-slate-500/10 text-slate-300',
  MEDIUM: 'bg-amber-500/10 text-amber-300',
  HIGH: 'bg-rose-500/10 text-rose-300',
  CRITICAL: 'bg-rose-500/10 text-rose-300',
  low: 'bg-slate-500/10 text-slate-300',
  medium: 'bg-amber-500/10 text-amber-300',
  high: 'bg-rose-500/10 text-rose-300',
  critical: 'bg-rose-500/10 text-rose-300',
};

export function SeverityBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]',
        toneMap[value] ?? 'bg-slate-500/10 text-slate-300',
      )}
    >
      {formatEnumLabel(value)}
    </span>
  );
}
