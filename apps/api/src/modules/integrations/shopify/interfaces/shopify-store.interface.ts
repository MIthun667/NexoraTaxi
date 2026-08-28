export interface ShopifyStoreView {
  id: string;
  organizationId: string;
  shopDomain: string;
  scope: string | null;
  installedAt: Date;
  uninstalledAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
