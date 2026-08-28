import Link from 'next/link';
import { ArrowRight, DatabaseZap, Store } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState({
  organizationId,
  title = 'Awaiting commerce data',
  description = 'Connect Shopify and run the first sync to unlock intelligence.',
}: {
  organizationId?: string;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={organizationId ? `/shopify/onboarding?organizationId=${organizationId}` : '/shopify/onboarding'}>
            <Button variant="default">
              <Store className="mr-2 h-4 w-4" />
              Connect Your Store
            </Button>
          </Link>
          <Link href={organizationId ? `/shopify/sync-health?organizationId=${organizationId}` : '/shopify/sync-health'}>
            <Button variant="outline">
              <DatabaseZap className="mr-2 h-4 w-4" />
              Review Data Status
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      }
    />
  );
}
