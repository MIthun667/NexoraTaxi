export interface ShopifyCustomer {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  orders_count?: number | null;
  total_spent?: string | null;
  state?: string | null;
  tags?: string | null;
}

export interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
}
