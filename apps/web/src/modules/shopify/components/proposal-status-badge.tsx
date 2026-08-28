import { CheckCircle2, Clock3, FileWarning, Inbox, XCircle } from 'lucide-react';

import { cn, formatEnumLabel } from '@/lib/utils';

export function ProposalStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'APPROVED'
      ? 'bg-emerald-500/10 text-emerald-300'
      : status === 'REJECTED'
        ? 'bg-rose-500/10 text-rose-300'
        : status === 'DEFERRED'
          ? 'bg-slate-500/10 text-slate-300'
        : status === 'NEEDS_REVISION'
          ? 'bg-amber-500/10 text-amber-300'
          : status === 'IN_REVIEW'
            ? 'bg-amber-500/10 text-amber-300'
            : 'bg-slate-500/10 text-slate-300';

  const Icon =
    status === 'APPROVED'
      ? CheckCircle2
      : status === 'REJECTED'
        ? XCircle
        : status === 'DEFERRED'
          ? Clock3
        : status === 'NEEDS_REVISION'
          ? FileWarning
          : status === 'IN_REVIEW'
            ? Clock3
            : Inbox;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]', tone)}>
      <Icon className="h-3 w-3" />
      {formatEnumLabel(status)}
    </span>
  );
}
