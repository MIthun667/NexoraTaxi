export interface StripeChargeRecord {
  id: string;
  payment_intent?: string | null;
  customer?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  paid?: boolean | null;
  refunded?: boolean | null;
  disputed?: boolean | null;
  created?: number | null;
}
