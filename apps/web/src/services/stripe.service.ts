import { apiClient } from '@/lib/api-client';
import { StripeConnectionStatus, StripeFinanceSummary } from '@/types/stripe';

export const stripeService = {
  getStatus(organizationId: string) {
    return apiClient
      .get<StripeConnectionStatus>('/integrations/stripe/status', {
        query: { organizationId },
      })
      .then((response) => response.data);
  },
  connect(input: { organizationId: string; secretKey: string }) {
    return apiClient
      .post<{ account: StripeConnectionStatus['account'] }>('/integrations/stripe/connect', input)
      .then((response) => response.data);
  },
  sync(organizationId: string) {
    return apiClient
      .post<StripeConnectionStatus['latestSyncRun']>('/integrations/stripe/sync', {
        organizationId,
      })
      .then((response) => response.data);
  },
  getFinanceSummary(organizationId: string) {
    return apiClient
      .get<StripeFinanceSummary>('/finance/stripe/summary', {
        query: { organizationId },
      })
      .then((response) => response.data);
  },
};
