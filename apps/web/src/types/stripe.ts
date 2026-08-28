export interface StripeConnectionStatus {
  connected: boolean;
  account: {
    id: string;
    organizationId: string;
    stripeAccountId: string;
    accountEmail?: string | null;
    isActive: boolean;
    connectedAt: string;
    disconnectedAt?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  latestSyncRun: {
    syncRunId: string;
    syncType: string;
    status: string;
    recordsProcessed: number;
    startedAt: string;
    completedAt?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface StripeFinanceSummary {
  connected: boolean;
  account: {
    id: string;
    stripeAccountId: string;
    accountEmail?: string | null;
    connectedAt: string;
    isActive: boolean;
  } | null;
  latestSyncRun: StripeConnectionStatus['latestSyncRun'];
  metrics: {
    confirmedRevenueToday: number;
    chargesToday: number;
    failedPaymentsCurrent24h: number;
    failedPaymentsPrevious24h: number;
    refundsCurrent24h: number;
    disputesCurrent24h: number;
    stripeRevenueCurrent24h: number;
    stripeRevenuePrevious24h: number;
    successfulChargesCurrent24h: number;
    successfulChargesPrevious24h: number;
    shopifyOrdersCurrent24h: number;
    shopifyOrdersPrevious24h: number;
  };
}
