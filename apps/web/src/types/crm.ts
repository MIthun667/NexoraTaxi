import { PaginatedResult } from '@/types/api';

export interface CrmCustomerProfile {
  id: string;
  organizationId: string;
  externalCustomerId: string;
  source: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  totalOrders: number;
  totalRevenue?: number | null;
  averageOrderValue?: number | null;
  firstOrderAt?: string | null;
  lastOrderAt?: string | null;
  isHighValue: boolean;
  isAtRisk: boolean;
  lifecycleStage?: string | null;
  tags?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmCustomerPreview {
  id: string;
  externalCustomerId: string;
  name: string;
  totalRevenue: number;
  lastOrderAt?: string | null;
  lifecycleStage?: string | null;
}

export interface CrmSegmentSummary {
  generatedAt: string;
  summary: {
    totalCustomers: number;
    highValueCustomers: number;
    atRiskCustomers: number;
    dormantCustomers: number;
    repeatCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    highValueAtRiskCustomers: number;
    topCustomerRevenueShare: number;
    repeatCustomerShareCurrent?: number | null;
    repeatCustomerSharePrevious?: number | null;
    retentionPressure: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  };
  topHighValueCustomers: CrmCustomerPreview[];
  topAtRiskCustomers: CrmCustomerPreview[];
}

export type CrmCustomerPaginatedResult = PaginatedResult<CrmCustomerProfile>;
