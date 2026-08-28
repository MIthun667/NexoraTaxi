'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  usePortfolioExecutive,
  useRefreshPortfolioExecutive,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { PortfolioFocusList } from './portfolio-focus-list';
import { PortfolioOrganizationCard } from './portfolio-organization-card';
import { PortfolioRollupStrip } from './portfolio-rollup-strip';
import { PortfolioSummaryPanel } from './portfolio-summary-panel';

export function PortfolioExecutiveScreen() {
  const router = useRouter();
  const activeContext = useDemoContext();
  const { hasPermission } = useAuth();
  const canRefresh = hasPermission(permissionLabels.intelligenceGenerate);

  const portfolioQuery = usePortfolioExecutive();
  const refreshPortfolioMutation = useRefreshPortfolioExecutive();

  if (activeContext.isLoading || portfolioQuery.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return <DashboardErrorState onRetry={() => portfolioQuery.refetch()} />;
  }

  const portfolio = portfolioQuery.data;

  if (portfolio.organizations.length === 0) {
    return (
      <EmptyState
        title="Portfolio insights are not available yet"
        description="Portfolio insights will become available once stores are connected."
      />
    );
  }

  const openOrganization = (organizationId: string, href: Route) => {
    activeContext.setSelectedScope(organizationId);
    router.push(href);
  };

  return (
    <div className="space-y-6">
      <PortfolioSummaryPanel
        summary={portfolio.portfolioSummary}
        limitations={portfolio.limitations}
      />

      <PortfolioRollupStrip
        trustRollup={portfolio.trustRollup}
        actionRollup={portfolio.actionRollup}
        outcomeRollup={portfolio.outcomeRollup}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Organizations"
          description="Ranked organizations and stores based on trust, action backlog, signal severity, and recent outcome trend."
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={!canRefresh || refreshPortfolioMutation.isPending}
              onClick={() => refreshPortfolioMutation.mutate({})}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {refreshPortfolioMutation.isPending ? 'Refreshing...' : 'Refresh'}
            </Button>
          }
        >
          <div className="space-y-4">
            {portfolio.organizations.map((item) => (
              <PortfolioOrganizationCard
                key={item.organizationId}
                item={item}
                onOpenOrganization={openOrganization}
              />
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <PortfolioFocusList items={portfolio.focusList} onOpenOrganization={openOrganization} />

          <SectionCard
            title="Top Cross-Org Signals"
            description="The most important signals currently concentrated across the portfolio."
            variant="subtle"
          >
            {portfolio.topSignals.length === 0 ? (
              <p className="text-sm text-slate-400">
                No significant cross-organization signals are active right now.
              </p>
            ) : (
              <div className="space-y-3">
                {portfolio.topSignals.map((signal) => (
                  <button
                    key={`${signal.organizationId}-${signal.signalId}`}
                    type="button"
                    onClick={() => openOrganization(signal.organizationId, '/shopify/signals')}
                    className="w-full rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{signal.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {signal.organizationName}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                        {formatStatus(signal.severity)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{signal.summary}</p>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
