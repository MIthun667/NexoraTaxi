'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { stripeService } from '@/services/stripe.service';

export function useStripeStatus(organizationId?: string) {
  return useQuery({
    queryKey: ['stripe-status', organizationId],
    queryFn: () => stripeService.getStatus(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useStripeFinanceSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['stripe-finance-summary', organizationId],
    queryFn: () => stripeService.getFinanceSummary(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useConnectStripe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; secretKey: string }) =>
      stripeService.connect(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-status', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['stripe-finance-summary', variables.organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-signals', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-insights', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-executive-summary', variables.organizationId],
      });
    },
  });
}

export function useRunStripeSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) => stripeService.sync(organizationId),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-status', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['stripe-finance-summary', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-signals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-insights', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-executive-summary', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-recommendations', organizationId],
      });
    },
  });
}
