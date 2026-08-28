import { apiClient, toPaginatedResult } from '@/lib/api-client';
import {
  DispatchAssignment,
  DispatchIncident,
  DispatchRun,
  DispatchShift,
  DispatchZone,
} from '@/types/entities';

function mapAssignment(data: any): DispatchAssignment {
  return {
    ...data,
    operatorId: data.driverId,
    assetId: data.vehicleId,
  };
}

function mapRun(data: any): DispatchRun {
  return {
    ...data,
    workOrderId: data.runCode,
    operationStatus: data.dispatchStatus,
  };
}

function mapIncident(data: any): DispatchIncident {
  return {
    ...data,
    workOrderId: data.runId,
  };
}

export const dispatchService = {
  listZones(params?: Record<string, string | number | boolean | undefined>) {
    return apiClient
      .get<DispatchZone[]>('/dispatch/zones', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getZone(id: string) {
    return apiClient.get<DispatchZone>(`/dispatch/zones/${id}`);
  },
  createZone(payload: Record<string, unknown>) {
    return apiClient.post<DispatchZone>('/dispatch/zones', payload);
  },
  updateZone(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<DispatchZone>(`/dispatch/zones/${id}`, payload);
  },
  listShifts(params?: Record<string, string | number | undefined>) {
    return apiClient
      .get<DispatchShift[]>('/dispatch/shifts', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getShift(id: string) {
    return apiClient.get<DispatchShift>(`/dispatch/shifts/${id}`);
  },
  createShift(payload: Record<string, unknown>) {
    return apiClient.post<DispatchShift>('/dispatch/shifts', payload);
  },
  updateShift(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<DispatchShift>(`/dispatch/shifts/${id}`, payload);
  },
  async listAssignments(params?: Record<string, string | number | undefined>) {
    const response = await apiClient.get<any[]>('/dispatch/assignments', { query: params });
    return {
      items: response.data.map(mapAssignment),
      meta: response.meta,
    };
  },
  async getAssignment(id: string) {
    const response = await apiClient.get<any>(`/dispatch/assignments/${id}`);
    return {
      ...response,
      data: mapAssignment(response.data),
    };
  },
  createAssignment(payload: Record<string, unknown>) {
    return apiClient.post<DispatchAssignment>('/dispatch/assignments', payload);
  },
  updateAssignment(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<DispatchAssignment>(`/dispatch/assignments/${id}`, payload);
  },
  releaseAssignment(id: string) {
    return apiClient.post<DispatchAssignment>(`/dispatch/assignments/${id}/release`);
  },
  async listRuns(params?: Record<string, string | number | undefined>) {
    const response = await apiClient.get<any[]>('/dispatch/runs', { query: params });
    return {
      items: response.data.map(mapRun),
      meta: response.meta,
    };
  },
  async getRun(id: string) {
    const response = await apiClient.get<any>(`/dispatch/runs/${id}`);
    return {
      ...response,
      data: mapRun(response.data),
    };
  },
  createRun(payload: Record<string, unknown>) {
    return apiClient.post<DispatchRun>('/dispatch/runs', payload);
  },
  updateRun(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<DispatchRun>(`/dispatch/runs/${id}`, payload);
  },
  async listIncidents(params?: Record<string, string | number | undefined>) {
    const response = await apiClient.get<any[]>('/dispatch/incidents', { query: params });
    return {
      items: response.data.map(mapIncident),
      meta: response.meta,
    };
  },
  async getIncident(id: string) {
    const response = await apiClient.get<any>(`/dispatch/incidents/${id}`);
    return {
      ...response,
      data: mapIncident(response.data),
    };
  },
  createIncident(payload: Record<string, unknown>) {
    return apiClient.post<DispatchIncident>('/dispatch/incidents', payload);
  },
  updateIncident(id: string, payload: Record<string, unknown>) {
    return apiClient.patch<DispatchIncident>(`/dispatch/incidents/${id}`, payload);
  },
};
