'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiNotificationsService } from '@/services/ai-notifications.service';

export function useAiNotifications(organizationId?: string) {
  return useQuery({
    queryKey: ['ai-notifications', organizationId],
    queryFn: () =>
      aiNotificationsService.list({
        organizationId: organizationId as string,
        page: 1,
        limit: 8,
        archived: false,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useAiNotificationUnreadCount(organizationId?: string) {
  return useQuery({
    queryKey: ['ai-notifications-unread-count', organizationId],
    queryFn: async () => {
      const result = await aiNotificationsService.list({
        organizationId: organizationId as string,
        page: 1,
        limit: 1,
        unreadOnly: true,
        archived: false,
      });

      return result.meta?.total ?? 0;
    },
    enabled: Boolean(organizationId),
  });
}

export function useMarkAiNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; notificationId: string }) =>
      aiNotificationsService.markRead(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-notifications', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['ai-notifications-unread-count', variables.organizationId],
      });
    },
  });
}

export function useMarkAllAiNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string }) => aiNotificationsService.markAllRead(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-notifications', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['ai-notifications-unread-count', variables.organizationId],
      });
    },
  });
}

export function useArchiveAiNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; notificationId: string }) =>
      aiNotificationsService.archive(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-notifications', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['ai-notifications-unread-count', variables.organizationId],
      });
    },
  });
}
