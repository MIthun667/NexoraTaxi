export interface ShopifySyncResourceState {
  available: boolean;
  synced: boolean;
  blocked: boolean;
  recordsProcessed: number;
}

export interface ShopifySyncMetadata {
  productsSynced?: boolean;
  productsProcessed?: number;
  ordersProcessed?: number;
  customersProcessed?: number;
  ordersBlocked?: boolean;
  customersBlocked?: boolean;
  protectedCustomerDataRequired?: boolean;
  syncCoverage?: 'FULL' | 'PARTIAL' | 'NONE' | string;
  capabilityState?: string;
  blockedReasons?: Record<string, unknown>;
  resources?: {
    products?: ShopifySyncResourceState;
    orders?: ShopifySyncResourceState;
    customers?: ShopifySyncResourceState;
  };
}

export interface ShopifyStoreView {
  id: string;
  organizationId: string;
  shopDomain: string;
  scope: string | null;
  installedAt: string;
  uninstalledAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifySyncRunView {
  syncRunId: string;
  syncType: string;
  status: string;
  recordsProcessed: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  metadata?: ShopifySyncMetadata | null;
}

export interface ShopifyConnectionStatus {
  connected: boolean;
  fullySynced: boolean;
  partiallySynced: boolean;
  limitedAccess: boolean;
  protectedCustomerDataRequired: boolean;
  syncCoverage: 'FULL' | 'PARTIAL' | 'NONE' | string;
  capabilities: {
    productsAvailable: boolean;
    ordersAvailable: boolean;
    customersAvailable: boolean;
  };
  store: ShopifyStoreView | null;
  latestSyncRun: ShopifySyncRunView | null;
}
