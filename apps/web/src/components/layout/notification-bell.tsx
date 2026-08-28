'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

import { useDemoContext } from '@/hooks/use-demo-context';
import {
  useAiNotificationUnreadCount,
  useAiNotifications,
  useArchiveAiNotification,
  useMarkAiNotificationRead,
  useMarkAllAiNotificationsRead,
} from '@/hooks/queries/use-ai-notifications';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

import { NotificationDropdown } from './notification-dropdown';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const notificationsQuery = useAiNotifications(organizationId);
  const unreadCountQuery = useAiNotificationUnreadCount(organizationId);
  const markReadMutation = useMarkAiNotificationRead();
  const markAllReadMutation = useMarkAllAiNotificationsRead();
  const archiveMutation = useArchiveAiNotification();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const unreadCount = unreadCountQuery.data ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={cn(
          'relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white',
          open ? 'bg-white/10 text-white' : '',
        )}
        onClick={() => setOpen((value) => !value)}
        aria-label="Open AI alerts"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationDropdown
          notifications={notificationsQuery.data?.items ?? []}
          unreadCount={unreadCount}
          isLoading={notificationsQuery.isLoading || unreadCountQuery.isLoading}
          isError={notificationsQuery.isError || unreadCountQuery.isError}
          onMarkRead={(notificationId) => {
            if (!organizationId) {
              return;
            }

            markReadMutation.mutate({ organizationId, notificationId });
          }}
          onMarkAllRead={() => {
            if (!organizationId) {
              return;
            }

            markAllReadMutation.mutate({ organizationId });
          }}
          onArchive={(notificationId) => {
            if (!organizationId) {
              return;
            }

            archiveMutation.mutate({ organizationId, notificationId });
          }}
          multiTenantHint={
            !activeContext.selectedOrganizationId && activeContext.canSelectScope
              ? 'Showing alerts for the current authenticated tenant while global organization scope is active.'
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
