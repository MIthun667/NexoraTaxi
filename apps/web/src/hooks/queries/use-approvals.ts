'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { approvalsService } from '@/services/approvals.service';

export function useApprovals(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['approvals', params],
    queryFn: () => approvalsService.queue(params),
  });
}

export function useApprovalRequest(id?: string) {
  return useQuery({
    queryKey: ['approval-request', id],
    queryFn: () => approvalsService.getRequest(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useApprovalStep(id?: string) {
  return useQuery({
    queryKey: ['approval-step', id],
    queryFn: () => approvalsService.getStep(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useActOnApprovalStep(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => approvalsService.actOnStep(id, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['approval-step', id] });
      queryClient.invalidateQueries({
        queryKey: ['approval-request', response.data.approvalRequest.id],
      });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
