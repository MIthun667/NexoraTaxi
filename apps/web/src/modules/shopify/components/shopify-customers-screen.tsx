'use client';

import Link from 'next/link';
import { ArrowRight, RefreshCcw, Users } from 'lucide-react';

import { DashboardErrorState } from '@/modules/shopify/components/dashboard-error-state';
import { DashboardLoadingSkeleton } from '@/modules/shopify/components/dashboard-loading-skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useDemoContext } from '@/hooks/use-demo-context';
import { useAuth } from '@/hooks/use-auth';
import { useAtRiskCustomers, useCrmSegments, useHighValueCustomers, useRebuildCrmProfiles } from '@/hooks/queries/use-crm';
import { permissionLabels } from '@/lib/navigation';

import { AtRiskCustomersList } from './at-risk-customers-list';
import { CustomerSegmentSummary } from './customer-segment-summary';
import { DashboardEmptyState } from './dashboard-empty-state';
import { HighValueCustomersList } from './high-value-customers-list';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifyCustomersScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canRebuildProfiles = hasPermission(permissionLabels.intelligenceGenerate);

  const segmentsQuery = useCrmSegments(organizationId);
  const highValueQuery = useHighValueCustomers(organizationId, 6);
  const atRiskQuery = useAtRiskCustomers(organizationId, 6);
  const rebuildProfilesMutation = useRebuildCrmProfiles();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [segmentsQuery.error, highValueQuery.error, atRiskQuery.error],
  });

  if (activeContext.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Customer intelligence"
          title="Select a tenant to view customer intelligence"
          description="Customer profiles and retention posture are organization-scoped. Choose a tenant to inspect its customer base clearly."
        />
        <EmptyState
          title="Multi-tenant organization scope is active"
          description="Pick a specific tenant from the organization scope switcher above to view its high-value customers, at-risk segments, and retention pressure."
          action={
            <Link href="/shopify/overview">
              <Button variant="outline">
                Open overview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (segmentsQuery.isLoading || highValueQuery.isLoading || atRiskQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (segmentsQuery.isError || highValueQuery.isError || atRiskQuery.isError || !segmentsQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          segmentsQuery.refetch();
          highValueQuery.refetch();
          atRiskQuery.refetch();
        }}
      />
    );
  }

  const segments = segmentsQuery.data;
  const highValueCustomers = highValueQuery.data?.items ?? [];
  const atRiskCustomers = atRiskQuery.data?.items ?? [];
  const hasCustomerData = segments.summary.totalCustomers > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer intelligence"
        title="Customer quality and retention overview"
        description="A CRM-like operating view of high-value customers, churn pressure, dormant segments, and retention quality."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/shopify/overview">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Overview
              </Button>
            </Link>
            <Button
              variant="default"
              onClick={() => {
                if (!organizationId) {
                  return;
                }
                rebuildProfilesMutation.mutate(organizationId);
              }}
              disabled={!canRebuildProfiles || rebuildProfilesMutation.isPending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {rebuildProfilesMutation.isPending ? 'Refreshing profiles...' : 'Refresh profiles'}
            </Button>
          </div>
        }
      />


      {!hasCustomerData ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="Customer intelligence needs synced commerce data"
          description="Connect Shopify and run the first sync to let Nexora build customer profiles, identify high-value accounts, and surface retention risk."
        />
      ) : (
        <>
          <CustomerSegmentSummary summary={segments} />

          <div className="grid gap-6 xl:grid-cols-2">
            <HighValueCustomersList customers={highValueCustomers} />
            <AtRiskCustomersList customers={atRiskCustomers} />
          </div>
        </>
      )}
    </div>
  );
}
