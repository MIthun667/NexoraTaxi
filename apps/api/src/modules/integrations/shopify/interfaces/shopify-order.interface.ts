export interface ShopifyOrder {
  id: number | string;
  name?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  currency?: string | null;
  total_price?: string | null;
  subtotal_price?: string | null;
  total_tax?: string | null;
  created_at?: string | null;
  customer?: {
    id?: number | string | null;
  } | null;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}
