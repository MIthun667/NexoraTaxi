import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { ApprovalQueueItem, ApprovalRequest, ApprovalStepDetail } from '@/types/entities';

export const approvalsService = {
  queue(params?: Record<string, string | number | undefined>) {
    return apiClient
      .get<ApprovalQueueItem[]>('/approvals/queue/my', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  createRequest(payload: Record<string, unknown>) {
    return apiClient.post('/approvals/requests', payload);
  },
  getRequest(id: string) {
    return apiClient.get<ApprovalRequest>(`/approvals/requests/${id}`);
  },
  getStep(id: string) {
    return apiClient.get<ApprovalStepDetail>(`/approvals/steps/${id}`);
  },
  actOnStep(id: string, payload: Record<string, unknown>) {
    return apiClient.post<ApprovalStepDetail>(`/approvals/steps/${id}/actions`, payload);
  },
};
