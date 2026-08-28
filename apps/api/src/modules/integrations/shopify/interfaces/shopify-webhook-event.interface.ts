export interface ShopifyWebhookEvent<TPayload = Record<string, unknown>> {
  topic: string;
  shopDomain: string;
  webhookId?: string | null;
  eventId?: string | null;
  payload: TPayload;
}
