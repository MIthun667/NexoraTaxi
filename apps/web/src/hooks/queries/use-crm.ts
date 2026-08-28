'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { crmService } from '@/services/crm.service';

export function useCrmSegments(organizationId?: string) {
  return useQuery({
    queryKey: ['crm-segments', organizationId],
    queryFn: () => crmService.getSegments(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useHighValueCustomers(organizationId?: string, limit = 5) {
  return useQuery({
    queryKey: ['crm-customers-high-value', organizationId, limit],
    queryFn: () =>
      crmService.getHighValueCustomers({
        organizationId: organizationId as string,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useAtRiskCustomers(organizationId?: string, limit = 5) {
  return useQuery({
    queryKey: ['crm-customers-at-risk', organizationId, limit],
    queryFn: () =>
      crmService.getAtRiskCustomers({
        organizationId: organizationId as string,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useRebuildCrmProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) => crmService.rebuildProfiles(organizationId),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['crm-segments', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['crm-customers-high-value', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['crm-customers-at-risk', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-signals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-insights', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-recommendations', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-executive-summary', organizationId],
      });
    },
  });
}
