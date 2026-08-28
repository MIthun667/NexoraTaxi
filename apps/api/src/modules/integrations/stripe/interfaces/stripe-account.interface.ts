export interface StripeAccountProfile {
  id: string;
  email?: string | null;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  country?: string | null;
  default_currency?: string | null;
}
