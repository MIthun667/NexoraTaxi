import { apiClient, toPaginatedResult } from '@/lib/api-client';
import {
  FleetMaintenanceRecord,
  FleetStatusHistoryEntry,
  FleetVehicle,
} from '@/types/entities';

function mapVehicle(data: any): FleetVehicle {
  return {
    ...data,
    assetId: data.vehicleCode,
    assetCategory: data.vehicleClass,
  };
}

export const fleetService = {
  async listVehicles(params?: Record<string, string | number | undefined>) {
    const response = await apiClient.get<any[]>('/fleet/vehicles', { query: params });
    return {
      items: response.data.map(mapVehicle),
      meta: response.meta,
    };
  },
  createVehicle(payload: Record<string, unknown>) {
    return apiClient.post<FleetVehicle>('/fleet/vehicles', payload);
  },
  async getVehicle(id: string) {
    const response = await apiClient.get<any>(`/fleet/vehicles/${id}`);
    return {
      ...response,
      data: mapVehicle(response.data),
    };
  },
  updateVehicle(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<FleetVehicle>(`/fleet/vehicles/${id}`, payload);
  },
  async listMaintenanceRecords(id: string) {
    const response = await apiClient.get<any[]>(`/fleet/vehicles/${id}/maintenance-records`);
    return {
      ...response,
      data: response.data.map((record) => ({
        ...record,
        assetId: record.vehicleId,
      })),
    };
  },
  async listStatusHistory(id: string) {
    const response = await apiClient.get<any[]>(`/fleet/vehicles/${id}/status-history`);
    return {
      ...response,
      data: response.data.map((entry) => ({
        ...entry,
        assetId: entry.vehicleId,
      })),
    };
  },
  updateStatus(id: string, payload: Record<string, unknown>) {
    return apiClient.post<FleetVehicle>(`/fleet/vehicles/${id}/status`, payload);
  },
};
