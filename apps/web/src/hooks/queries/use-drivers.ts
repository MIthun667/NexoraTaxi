'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { driversService } from '@/services/drivers.service';

export function useDrivers(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['drivers', params],
    queryFn: () => driversService.list(params),
  });
}

export function useDriver(id?: string) {
  return useQuery({
    queryKey: ['drivers', id],
    queryFn: () => driversService.get(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDriverDocuments(id?: string) {
  return useQuery({
    queryKey: ['drivers', id, 'documents'],
    queryFn: () => driversService.listDocuments(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDriverStatusHistory(id?: string) {
  return useQuery({
    queryKey: ['drivers', id, 'status-history'],
    queryFn: () => driversService.listStatusHistory(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useUpdateDriverStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => driversService.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', id] });
      queryClient.invalidateQueries({ queryKey: ['drivers', id, 'status-history'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}
