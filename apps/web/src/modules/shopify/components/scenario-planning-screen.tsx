'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import {
  useAnalyzeScenario,
  useCommerceDataTrust,
  useScenarioPlanningOptions,
} from '@/hooks/queries/use-shopify-intelligence';
import { useAuth } from '@/hooks/use-auth';
import { useDemoContext } from '@/hooks/use-demo-context';

import { CommerceDataTrustPanel } from './commerce-data-trust';
import { DashboardErrorState } from './dashboard-error-state';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';
import { ScenarioAnalysisCard } from './scenario-analysis-card';
import { ScenarioSelector } from './scenario-selector';
import { useShopifyOrganizationFallback } from '../hooks/use-shopify-organization-fallback';

export function ScenarioPlanningScreen() {
  const activeContext = useDemoContext();
  const { user } = useAuth();
  const organizationId = activeContext.selectedOrganizationId ?? user?.organizationId;
  const isAllMode = !activeContext.selectedOrganizationId && activeContext.canSelectScope;

  const optionsQuery = useScenarioPlanningOptions();
  const dataTrustQuery = useCommerceDataTrust(organizationId);
  const analyzeScenarioMutation = useAnalyzeScenario();
  const [selectedScenarioType, setSelectedScenarioType] = useState<string | null>(null);

  const isRecoveringScope = useShopifyOrganizationFallback({
    organizationId,
    userOrganizationId: user?.organizationId,
    selectedScope: activeContext.selectedScope,
    canSelectScope: activeContext.canSelectScope,
    setSelectedScope: activeContext.setSelectedScope,
    errors: [dataTrustQuery.error],
  });

  useEffect(() => {
    if (!selectedScenarioType && optionsQuery.data?.[0]?.type) {
      setSelectedScenarioType(optionsQuery.data[0].type);
    }
  }, [optionsQuery.data, selectedScenarioType]);

  useEffect(() => {
    if (!organizationId || !selectedScenarioType || analyzeScenarioMutation.data) {
      return;
    }

    analyzeScenarioMutation.mutate({
      organizationId,
      scenarioType: selectedScenarioType,
    });
  }, [analyzeScenarioMutation, organizationId, selectedScenarioType]);

  if (activeContext.isLoading || optionsQuery.isLoading || dataTrustQuery.isLoading || isRecoveringScope) {
    return <DashboardLoadingSkeleton />;
  }

  if (isAllMode) {
    return (
      <EmptyState
        title="Select an organization to continue"
        description="Scenario planning is organization-scoped so what-if analysis stays grounded in one store or business unit at a time."
      />
    );
  }

  if (optionsQuery.isError || dataTrustQuery.isError || !optionsQuery.data || !dataTrustQuery.data) {
    return <DashboardErrorState onRetry={() => {
      optionsQuery.refetch();
      dataTrustQuery.refetch();
    }} />;
  }

  const trust = dataTrustQuery.data;

  return (
    <div className="space-y-6">
      <CommerceDataTrustPanel
        trust={trust}
        title="Scenario Trust"
        description="Use current freshness and coverage to judge how strongly to interpret this directional scenario analysis."
      />

      <SectionCard
        title="Scenario Planning"
        description="A bounded what-if layer for current store health, trust, actions, and operating conditions."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!organizationId || !selectedScenarioType || analyzeScenarioMutation.isPending}
            onClick={() => {
              if (!organizationId || !selectedScenarioType) {
                return;
              }
              analyzeScenarioMutation.mutate({
                organizationId,
                scenarioType: selectedScenarioType,
              });
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {analyzeScenarioMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        }
      >
        <div className="space-y-5">
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            Scenario planning stays bounded to supported operating conditions. It is directional, trust-aware, and grounded in the current Nexora intelligence stack rather than speculative forecasting.
          </p>
          <ScenarioSelector
            options={optionsQuery.data}
            selectedType={selectedScenarioType}
            onSelect={(scenarioType) => {
              setSelectedScenarioType(scenarioType);
              if (organizationId) {
                analyzeScenarioMutation.mutate({
                  organizationId,
                  scenarioType,
                });
              }
            }}
          />
        </div>
      </SectionCard>

      {!trust.integrations.shopify.connected ? (
        <EmptyState
          title="Scenario analysis is not available yet"
          description="Scenario analysis becomes available once store data is connected."
        />
      ) : analyzeScenarioMutation.isError ? (
        <DashboardErrorState onRetry={() => {
          if (organizationId && selectedScenarioType) {
            analyzeScenarioMutation.mutate({
              organizationId,
              scenarioType: selectedScenarioType,
            });
          }
        }} />
      ) : analyzeScenarioMutation.isPending && !analyzeScenarioMutation.data ? (
        <DashboardLoadingSkeleton />
      ) : analyzeScenarioMutation.data ? (
        <ScenarioAnalysisCard analysis={analyzeScenarioMutation.data} />
      ) : (
        <EmptyState
          title="Run a scenario to begin"
          description="Choose one of the supported what-if scenarios above to generate a bounded analysis."
        />
      )}
    </div>
  );
}
