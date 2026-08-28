'use client';

import { useQuery } from '@tanstack/react-query';

import { observabilityService } from '@/services/observability.service';

export function useObservabilitySummary(enabled = true) {
  return useQuery({
    queryKey: ['observability', 'summary'],
    queryFn: () => observabilityService.summary().then((response) => response.data),
    enabled,
  });
}

export function usePlatformHealth(enabled = true) {
  return useQuery({
    queryKey: ['observability', 'health'],
    queryFn: () => observabilityService.health().then((response) => response.data),
    enabled,
  });
}
