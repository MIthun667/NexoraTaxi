'use client';

import Link from 'next/link';
import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  useExecutiveCopilot,
  useRefreshExecutiveCopilot,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';
import { permissionLabels } from '@/lib/navigation';

import { AiRecommendationList } from './ai-recommendation-list';
import { AiSignalList } from './ai-signal-list';
import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ExecutiveActionsPanel } from './executive-actions-panel';
import { ExecutiveAgentHighlights } from './executive-agent-highlights';
import { ExecutiveFocusList } from './executive-focus-list';
import { ExecutiveQaPanel } from './executive-qa-panel';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ExecutiveCopilotScreen() {
  const activeContext = useDemoContext();
  const { user, hasPermission } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;
  const canRefresh = hasPermission(permissionLabels.intelligenceGenerate);

  const executiveCopilotQuery = useExecutiveCopilot(organizationId);
  const refreshExecutiveCopilotMutation = useRefreshExecutiveCopilot();
  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [executiveCopilotQuery.error],
  });

  if (activeContext.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <EmptyState
        title="Multi-tenant organization scope is active"
        description="Pick a specific organization from the scope switcher above to review its executive copilot briefing."
        action={
          <Link href="/shopify/overview">
            <Button variant="outline">Open overview</Button>
          </Link>
        }
      />
    );
  }

  if (executiveCopilotQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (executiveCopilotQuery.isError || !executiveCopilotQuery.data) {
    return <DashboardErrorState onRetry={() => executiveCopilotQuery.refetch()} />;
  }

  const executiveCopilot = executiveCopilotQuery.data;
  const primaryStore = executiveCopilot.connectedStoreStatus.primaryStore;

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={executiveCopilot.trust}
        title="Executive Trust"
        description="Current data freshness, visibility, and integration coverage behind this leadership briefing."
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard
          title="Executive Copilot"
          description="A concise leadership view grounded in current store data, governed intelligence, and reviewed actions."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/shopify/scenarios">
                <Button variant="outline" size="sm">Open Scenarios</Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                disabled={!canRefresh || refreshExecutiveCopilotMutation.isPending}
                onClick={() => {
                  if (!organizationId) {
                    return;
                  }
                  refreshExecutiveCopilotMutation.mutate(organizationId);
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {refreshExecutiveCopilotMutation.isPending ? 'Refreshing summary...' : 'Refresh Summary'}
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="max-w-3xl space-y-3">
              <p className="text-[15px] font-medium leading-relaxed text-slate-200">
                {executiveCopilot.topSummary.summary}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryPoint label="What Changed" value={executiveCopilot.topSummary.whatChanged} />
                <SummaryPoint label="What Matters" value={executiveCopilot.topSummary.whatMatters} />
              </div>
            </div>
            <ExecutiveFocusList items={executiveCopilot.executiveFocus} />
          </div>
        </SectionCard>

        <SectionCard
          title="Store Summary"
          description="Primary connection state and leadership-facing limitations."
          variant="subtle"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{executiveCopilot.connectedStoreStatus.summary}</p>
            <dl className="space-y-3 text-sm">
              <SummaryStat label="Store" value={primaryStore?.storeName ?? 'Not connected'} />
              <SummaryStat label="Connection" value={formatStatus(primaryStore?.connectionStatus ?? 'not_connected')} />
              <SummaryStat label="Shopify" value={formatStatus(primaryStore?.shopifyStatus ?? 'not_connected')} />
              <SummaryStat label="Payments" value={formatStatus(primaryStore?.stripeStatus ?? 'not_connected')} />
            </dl>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AiSignalList
          signals={executiveCopilot.keySignals}
          title="Key Signals"
          description="The most important business changes currently affecting leadership decisions."
        />
        <AiRecommendationList
          recommendations={executiveCopilot.keyRecommendations}
          title="Key Recommendations"
          description="Advisory guidance leadership should consider before changing strategy or spend."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ExecutiveActionsPanel actions={executiveCopilot.pendingActions} />
        <SectionCard
          title="Learning Highlights"
          description="Simple outcome and approval signals from recent reviewed actions."
          variant="subtle"
          actions={
            <Link href="/shopify/outcomes">
              <Button variant="outline" size="sm">View outcomes</Button>
            </Link>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{executiveCopilot.learningHighlights.summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <LearningStat label="Tracked actions" value={String(executiveCopilot.learningHighlights.totalActionsTracked)} />
              <LearningStat label="Helpful outcomes" value={formatPercent(executiveCopilot.learningHighlights.positiveOutcomeRate)} />
              <LearningStat label="Approval rate" value={formatPercent(executiveCopilot.learningHighlights.operatorApprovalRate)} />
            </div>
          </div>
        </SectionCard>
      </div>

      <ExecutiveQaPanel organizationId={organizationId} />

      <ExecutiveAgentHighlights items={executiveCopilot.agentHighlights} />
    </div>
  );
}

function SummaryPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-300">{value}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function LearningStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}
