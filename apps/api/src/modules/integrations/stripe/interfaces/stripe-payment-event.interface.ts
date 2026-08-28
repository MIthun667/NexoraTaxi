export interface StripePaymentEventRecord {
  id: string;
  type: string;
  created?: number | null;
  data?: {
    object?: Record<string, unknown>;
  };
}
