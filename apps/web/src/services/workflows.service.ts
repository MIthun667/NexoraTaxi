import { apiClient, toPaginatedResult } from '@/lib/api-client';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTaskDetail,
  WorkflowTaskListItem,
} from '@/types/entities';

export const workflowsService = {
  listDefinitions(params?: Record<string, string | number | undefined>) {
    return apiClient
      .get<WorkflowDefinition[]>('/workflows/definitions', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getInstance(id: string) {
    return apiClient.get<WorkflowInstance>(`/workflows/instances/${id}`);
  },
  getMyTasks(params?: Record<string, string | number | undefined>) {
    return apiClient
      .get<WorkflowTaskListItem[]>('/workflows/tasks/my', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getTask(id: string) {
    return apiClient.get<WorkflowTaskDetail>(`/workflows/tasks/${id}`);
  },
  actOnTask(id: string, payload: Record<string, unknown>) {
    return apiClient.post<WorkflowTaskDetail>(`/workflows/tasks/${id}/actions`, payload);
  },
};
