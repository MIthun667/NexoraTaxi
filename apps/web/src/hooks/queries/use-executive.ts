'use client';

import { useQuery } from '@tanstack/react-query';

import { executiveService } from '@/services/executive.service';

export function useExecutiveOverview(organizationId?: string) {
  return useQuery({
    queryKey: ['executive', 'overview', organizationId],
    queryFn: () => executiveService.getOverview(organizationId),
  });
}

export function useExecutiveReport(id?: string) {
  return useQuery({
    queryKey: ['executive', 'report', id],
    queryFn: () => executiveService.getReport(id as string),
    enabled: Boolean(id),
  });
}
