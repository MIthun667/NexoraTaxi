import { apiClient } from '@/lib/api-client';
import { ShopifyConnectionStatus, ShopifySyncRunView } from '@/types/shopify';

export const shopifyService = {
  getConnectionStatus(organizationId: string) {
    return apiClient
      .get<ShopifyConnectionStatus>('/integrations/shopify/status', {
        query: { organizationId },
      })
      .then((response) => response.data);
  },
  getConnectUrl(organizationId: string, shopDomain: string) {
    return apiClient
      .get<{
        organizationId: string;
        shopDomain: string;
        installUrl: string;
        stateExpiresAt: string;
      }>('/integrations/shopify/connect', {
        query: { organizationId, shopDomain },
      })
      .then((response) => response.data);
  },
  runInitialSync(organizationId: string) {
    return apiClient
      .post<ShopifySyncRunView>('/integrations/shopify/sync/all', {
        organizationId,
      })
      .then((response) => response.data);
  },
  listSyncStatus(organizationId: string) {
    return apiClient
      .get<ShopifySyncRunView[]>('/integrations/shopify/sync/status', {
        query: { organizationId },
      })
      .then((response) => response.data);
  },
};
