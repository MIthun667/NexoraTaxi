'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/layout/notification-item';
import { AiNotification } from '@/types/ai-notification';

export function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  isError,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  multiTenantHint,
}: {
  notifications: AiNotification[];
  unreadCount: number;
  isLoading?: boolean;
  isError?: boolean;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onArchive: (notificationId: string) => void;
  multiTenantHint?: string;
}) {
  return (
    <div className="absolute right-0 top-14 z-50 w-[420px] rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-semibold text-white">AI alerts</p>
          <p className="text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all read
        </Button>
      </div>

      {multiTenantHint ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
          {multiTenantHint}
        </div>
      ) : null}

      <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.03] py-10 text-sm text-slate-400">
            <Loader2 className="mb-3 h-5 w-5 animate-spin" />
            Loading AI alerts...
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-4 text-sm text-rose-100">
            Nexora could not load AI alerts right now.
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
            No AI alerts yet. Nexora will surface high-priority commerce changes here as soon as they require attention.
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => onMarkRead(notification.id)}
              onArchive={() => onArchive(notification.id)}
            />
          ))
        )}
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link href="/shopify" className="text-sm font-medium text-[var(--brand-400)] hover:text-[var(--brand-300)]">
          Open Commerce Intelligence
        </Link>
      </div>
    </div>
  );
}
