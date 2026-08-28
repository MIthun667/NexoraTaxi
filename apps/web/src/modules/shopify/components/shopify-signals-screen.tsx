'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  useCommerceDataTrust,
  useFilteredShopifySignals,
  useRefreshShopifySignals,
  useShopifyInsights,
  useShopifySummary,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';

import { AiInsightList } from './ai-insight-list';
import { AiSignalList } from './ai-signal-list';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ShopifyKpiStrip } from './shopify-kpi-strip';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ShopifySignalsScreen() {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const [severity, setSeverity] = useState<string>('all');
  const [affectedArea, setAffectedArea] = useState<string>('all');
  const [freshnessStatus, setFreshnessStatus] = useState<string>('all');
  const filters = useMemo(
    () => ({
      severity: severity === 'all' ? undefined : severity,
      affectedArea: affectedArea === 'all' ? undefined : affectedArea,
      freshnessStatus: freshnessStatus === 'all' ? undefined : freshnessStatus,
    }),
    [affectedArea, freshnessStatus, severity],
  );

  const summaryQuery = useShopifySummary(organizationId);
  const trustQuery = useCommerceDataTrust(organizationId);
  const signalsQuery = useFilteredShopifySignals(organizationId, filters);
  const insightsQuery = useShopifyInsights(organizationId);
  const refreshSignalsMutation = useRefreshShopifySignals();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [summaryQuery.error, trustQuery.error, signalsQuery.error, insightsQuery.error],
  });

  if (activeContext.isLoading || summaryQuery.isLoading || trustQuery.isLoading || signalsQuery.isLoading || insightsQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Signals need a single organization scope"
          description="Choose one organization to review current risks, changes, and evidence-backed insight."
        />
      </div>
    );
  }

  if (summaryQuery.isError || trustQuery.isError || signalsQuery.isError || insightsQuery.isError || !summaryQuery.data) {
    return (
      <DashboardErrorState
        onRetry={() => {
          summaryQuery.refetch();
          trustQuery.refetch();
          signalsQuery.refetch();
          insightsQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;
  const trust = trustQuery.data ?? null;
  const signals = signalsQuery.data ?? [];
  const insights = insightsQuery.data ?? [];
  const hasSignalData = signals.length > 0 || insights.length > 0 || summary.metrics.highSeveritySignalsCount > 0;
  const staleSignals = signals.filter((signal) => signal.freshnessStatus === 'stale').length;
  const delayedSignals = signals.filter((signal) => signal.freshnessStatus === 'delayed').length;
  const criticalSignals = signals.filter((signal) => signal.severity === 'critical').length;
  const highSignals = signals.filter((signal) => signal.severity === 'high').length;

  return (
    <div className="space-y-6">
      {!hasSignalData ? (
        <DashboardEmptyState
          organizationId={organizationId}
          title="No significant signals detected"
          description="Nexora has not detected a material revenue, customer, payment, or coverage issue in the current window."
        />
      ) : (
        <>
          <CommerceDataTrustPanel
            trust={trust}
            title="Data Status"
            description="Use current data trust to judge how confidently to treat the signals below."
          />

          <ShopifyKpiStrip
            totalRevenue={summary.metrics.totalRevenue}
            totalOrders={summary.metrics.totalOrders}
            newCustomers={summary.metrics.newCustomers}
            highSeveritySignals={summary.metrics.highSeveritySignalsCount}
            refundTelemetryAvailable={Boolean(summary.metrics.refundTelemetryAvailable)}
          />

          <SectionCard
            title="Signal Review"
            description="Review the most important signals, filter noise, and validate what needs action next."
            actions={
              <button
                type="button"
                onClick={() => {
                  if (organizationId) {
                    refreshSignalsMutation.mutate(organizationId);
                  }
                }}
                className="text-sm font-medium text-slate-300 transition hover:text-slate-100"
              >
                {refreshSignalsMutation.isPending ? 'Refreshing...' : 'Refresh signals'}
              </button>
            }
            variant="subtle"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={criticalSignals > 0 ? 'issue' : 'healthy'} />
                <span className="text-sm text-slate-300">
                  {criticalSignals > 0
                    ? `${criticalSignals} critical signal${criticalSignals === 1 ? '' : 's'} active`
                    : highSignals > 0
                      ? `${highSignals} high-priority signal${highSignals === 1 ? '' : 's'} active`
                      : 'No critical issues detected right now'}
                </span>
                {staleSignals > 0 || delayedSignals > 0 ? (
                  <span className="text-sm text-slate-400">
                    {staleSignals > 0
                      ? `${staleSignals} stale signal${staleSignals === 1 ? '' : 's'} need careful review`
                      : `${delayedSignals} delayed signal${delayedSignals === 1 ? '' : 's'} depend on slower data`}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                <Select value={affectedArea} onChange={(event) => setAffectedArea(event.target.value)}>
                  <option value="all">All areas</option>
                  <option value="revenue">Revenue</option>
                  <option value="orders">Orders</option>
                  <option value="customers">Customers</option>
                  <option value="products">Products</option>
                  <option value="payments">Payments</option>
                  <option value="integrations">Integrations</option>
                  <option value="data_quality">Data quality</option>
                </Select>
                <Select value={freshnessStatus} onChange={(event) => setFreshnessStatus(event.target.value)}>
                  <option value="all">All freshness states</option>
                  <option value="fresh">Fresh</option>
                  <option value="delayed">Delayed</option>
                  <option value="stale">Stale</option>
                </Select>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <AiSignalList
              signals={signals}
              emptyMessage={
                staleSignals > 0 || delayedSignals > 0
                  ? 'Signal generation is limited until store data is current.'
                  : 'No significant signals detected.'
              }
            />
            <AiInsightList insights={insights} highSeveritySignals={summary.metrics.highSeveritySignalsCount} />
          </div>
        </>
      )}
    </div>
  );
}
