import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { CrmCustomerPaginatedResult, CrmCustomerProfile, CrmSegmentSummary } from '@/types/crm';

type ScopedQuery = {
  organizationId: string;
  page?: number;
  limit?: number;
};

export const crmService = {
  getCustomers(query: ScopedQuery) {
    return apiClient
      .get<CrmCustomerProfile[]>('/crm/customers', { query })
      .then((response) => toPaginatedResult(response) as CrmCustomerPaginatedResult);
  },
  getHighValueCustomers(query: ScopedQuery) {
    return apiClient
      .get<CrmCustomerProfile[]>('/crm/customers/high-value', { query })
      .then((response) => toPaginatedResult(response) as CrmCustomerPaginatedResult);
  },
  getAtRiskCustomers(query: ScopedQuery) {
    return apiClient
      .get<CrmCustomerProfile[]>('/crm/customers/at-risk', { query })
      .then((response) => toPaginatedResult(response) as CrmCustomerPaginatedResult);
  },
  getSegments(organizationId: string) {
    return apiClient
      .get<CrmSegmentSummary>('/crm/segments', {
        query: { organizationId },
      })
      .then((response) => response.data);
  },
  rebuildProfiles(organizationId: string) {
    return apiClient
      .post<{
        organizationId: string;
        profilesRebuilt: number;
        source: string;
        rebuiltAt: string;
      }>('/crm/rebuild-profiles', { organizationId })
      .then((response) => response.data);
  },
};
