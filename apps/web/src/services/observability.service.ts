import { apiClient } from '@/lib/api-client';
import { PlatformHealth, ObservabilitySummary } from '@/types/observability';

export const observabilityService = {
  summary() {
    return apiClient.get<ObservabilitySummary>('/observability/summary');
  },
  health() {
    return apiClient.get<PlatformHealth>('/observability/health');
  },
};
