'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dispatchService } from '@/services/dispatch.service';

export function useDispatchAssignments(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['dispatch-assignments', params],
    queryFn: () => dispatchService.listAssignments(params),
  });
}

export function useDispatchAssignment(id?: string) {
  return useQuery({
    queryKey: ['dispatch-assignments', id],
    queryFn: () => dispatchService.getAssignment(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDispatchZones(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['dispatch-zones', params],
    queryFn: () => dispatchService.listZones(params),
  });
}

export function useDispatchZone(id?: string) {
  return useQuery({
    queryKey: ['dispatch-zones', id],
    queryFn: () => dispatchService.getZone(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDispatchShifts(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['dispatch-shifts', params],
    queryFn: () => dispatchService.listShifts(params),
  });
}

export function useDispatchShift(id?: string) {
  return useQuery({
    queryKey: ['dispatch-shifts', id],
    queryFn: () => dispatchService.getShift(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDispatchRuns(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['dispatch-runs', params],
    queryFn: () => dispatchService.listRuns(params),
  });
}

export function useDispatchRun(id?: string) {
  return useQuery({
    queryKey: ['dispatch-runs', id],
    queryFn: () => dispatchService.getRun(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDispatchIncidents(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['dispatch-incidents', params],
    queryFn: () => dispatchService.listIncidents(params),
  });
}

export function useDispatchIncident(id?: string) {
  return useQuery({
    queryKey: ['dispatch-incidents', id],
    queryFn: () => dispatchService.getIncident(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useReleaseDispatchAssignment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => dispatchService.releaseAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-assignments', id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-assignments'] });
    },
  });
}
