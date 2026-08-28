'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fleetService } from '@/services/fleet.service';

export function useFleetVehicles(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['fleet-vehicles', params],
    queryFn: () => fleetService.listVehicles(params),
  });
}

export function useFleetVehicle(id?: string) {
  return useQuery({
    queryKey: ['fleet-vehicles', id],
    queryFn: () => fleetService.getVehicle(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useFleetMaintenanceRecords(id?: string) {
  return useQuery({
    queryKey: ['fleet-vehicles', id, 'maintenance-records'],
    queryFn: () =>
      fleetService.listMaintenanceRecords(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useFleetStatusHistory(id?: string) {
  return useQuery({
    queryKey: ['fleet-vehicles', id, 'status-history'],
    queryFn: () => fleetService.listStatusHistory(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useUpdateFleetStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => fleetService.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles', id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles', id, 'status-history'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
    },
  });
}
