import { ErrorState } from '@/components/layout/error-state';

export function DashboardErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Unable to load Shopify intelligence."
      description="Nexora could not retrieve the latest Shopify AI summary, signals, or insights. Verify the store connection, sync status, and backend availability, then try again."
      onRetry={onRetry}
    />
  );
}
