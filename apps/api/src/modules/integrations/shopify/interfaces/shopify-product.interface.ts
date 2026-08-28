export interface ShopifyProduct {
  id: number | string;
  title?: string | null;
  handle?: string | null;
  status?: string | null;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}
