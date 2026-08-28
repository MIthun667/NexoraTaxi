import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { Driver, DriverDocument, DriverStatusHistoryEntry } from '@/types/entities';

function mapDriver(data: any): Driver {
  return {
    ...data,
    workforceId: data.driverCode,
    credentialId: data.licenseNumber,
  };
}

export const driversService = {
  async list(params?: Record<string, string | number | undefined>) {
    const response = await apiClient.get<any[]>('/drivers', { query: params });
    return {
      items: response.data.map(mapDriver),
      meta: response.meta,
    };
  },
  async get(id: string) {
    const response = await apiClient.get<any>(`/drivers/${id}`);
    return {
      ...response,
      data: mapDriver(response.data),
    };
  },
  create(payload: Record<string, unknown>) {
    return apiClient.post<Driver>('/drivers', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<Driver>(`/drivers/${id}`, payload);
  },
  async listDocuments(id: string) {
    const response = await apiClient.get<any[]>(`/drivers/${id}/documents`);
    return {
      ...response,
      data: response.data.map((doc) => ({
        ...doc,
        operatorId: doc.driverId,
      })),
    };
  },
  async listStatusHistory(id: string) {
    const response = await apiClient.get<any[]>(`/drivers/${id}/status-history`);
    return {
      ...response,
      data: response.data.map((entry) => ({
        ...entry,
        operatorId: entry.driverId,
      })),
    };
  },
  updateStatus(id: string, payload: Record<string, unknown>) {
    return apiClient.post<Driver>(`/drivers/${id}/status`, payload);
  },
};
