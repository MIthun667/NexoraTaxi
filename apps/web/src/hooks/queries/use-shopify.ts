'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shopifyService } from '@/services/shopify.service';

export function useShopifyConnectionStatus(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-connection-status', organizationId],
    queryFn: () => shopifyService.getConnectionStatus(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useShopifySyncStatus(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-sync-status', organizationId],
    queryFn: () => shopifyService.listSyncStatus(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useConnectShopify() {
  return useMutation({
    mutationFn: (input: { organizationId: string; shopDomain: string }) =>
      shopifyService.getConnectUrl(input.organizationId, input.shopDomain),
  });
}

export function useRunInitialShopifySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) => shopifyService.runInitialSync(organizationId),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-connection-status', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-sync-status', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-signals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-insights', organizationId] });
    },
  });
}
