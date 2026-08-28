'use client';

import { Archive, BellRing, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, formatDateTime, formatEnumLabel } from '@/lib/utils';
import { AiNotification } from '@/types/ai-notification';

export function NotificationItem({
  notification,
  onMarkRead,
  onArchive,
}: {
  notification: AiNotification;
  onMarkRead: () => void;
  onArchive: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition',
        notification.severity === 'CRITICAL'
          ? 'border-rose-500/30 bg-rose-500/[0.08]'
          : notification.severity === 'HIGH'
            ? 'border-amber-500/30 bg-amber-500/[0.07]'
            : 'border-white/10 bg-white/[0.03]',
        notification.isRead ? 'opacity-80' : '',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityPill severity={notification.severity} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatEnumLabel(notification.type)}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{notification.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</p>
          </div>
          <p className="text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!notification.isRead ? (
            <Button size="sm" variant="ghost" onClick={onMarkRead}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onArchive}>
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
        severity === 'CRITICAL'
          ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/25'
          : severity === 'HIGH'
            ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/25'
            : severity === 'MEDIUM'
              ? 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20'
              : 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/20',
      )}
    >
      <BellRing className="h-3 w-3" />
      {severity}
    </span>
  );
}
