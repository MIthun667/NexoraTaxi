'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workflowsService } from '@/services/workflows.service';

export function useWorkflowDefinitions(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['workflow-definitions', params],
    queryFn: () => workflowsService.listDefinitions(params),
  });
}

export function useWorkflowTasks(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['workflow-tasks', params],
    queryFn: () => workflowsService.getMyTasks(params),
  });
}

export function useWorkflowTask(id?: string) {
  return useQuery({
    queryKey: ['workflow-task', id],
    queryFn: () => workflowsService.getTask(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useWorkflowInstance(id?: string) {
  return useQuery({
    queryKey: ['workflow-instance', id],
    queryFn: () => workflowsService.getInstance(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useActOnWorkflowTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => workflowsService.actOnTask(id, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-task', id] });
      queryClient.invalidateQueries({
        queryKey: ['workflow-instance', response.data.instance.id],
      });
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
    },
  });
}
