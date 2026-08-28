import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { PaginatedResult } from '@/types/api';
import { AiNotification } from '@/types/ai-notification';

type ScopedNotificationQuery = {
  organizationId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  archived?: boolean;
  severity?: string;
};

export const aiNotificationsService = {
  list(query: ScopedNotificationQuery) {
    return apiClient
      .get<AiNotification[]>('/ai/notifications', { query })
      .then((response) => toPaginatedResult(response) as PaginatedResult<AiNotification>);
  },
  markRead(input: { organizationId: string; notificationId: string }) {
    return apiClient
      .post<AiNotification>('/ai/notifications/mark-read', input)
      .then((response) => response.data);
  },
  markAllRead(input: { organizationId: string }) {
    return apiClient
      .post<{ updatedCount: number }>('/ai/notifications/mark-all-read', input)
      .then((response) => response.data);
  },
  archive(input: { organizationId: string; notificationId: string }) {
    return apiClient
      .post<AiNotification>('/ai/notifications/archive', input)
      .then((response) => response.data);
  },
};
