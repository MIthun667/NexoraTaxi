import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { ActionProposalService } from '../intelligence/action-proposal.service';
import { AiCommerceMetricsService } from '../intelligence/ai-commerce-metrics.service';
import { AiConnectedStoresService } from '../intelligence/ai-connected-stores.service';
import { AiDataTrustService } from '../intelligence/ai-data-trust.service';
import { AiDailyBriefService } from '../intelligence/ai-daily-brief.service';
import { AiExecutionService } from '../intelligence/ai-execution.service';
import { AiLearningService } from '../intelligence/ai-learning.service';
import { AiRecommendationService } from '../intelligence/ai-recommendation.service';
import { AiSignalService } from '../intelligence/ai-signal.service';
import { CommerceAgentContext } from './commerce-agent.types';

@Injectable()
export class CommerceAgentContextService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
  ) {}

  private get aiDataTrustService() {
    return this.moduleRef.get(AiDataTrustService, { strict: false });
  }

  private get aiSignalService() {
    return this.moduleRef.get(AiSignalService, { strict: false });
  }

  private get aiDailyBriefService() {
    return this.moduleRef.get(AiDailyBriefService, { strict: false });
  }

  private get aiRecommendationService() {
    return this.moduleRef.get(AiRecommendationService, { strict: false });
  }

  private get actionProposalService() {
    return this.moduleRef.get(ActionProposalService, { strict: false });
  }

  private get aiExecutionService() {
    return this.moduleRef.get(AiExecutionService, { strict: false });
  }

  private get aiLearningService() {
    return this.moduleRef.get(AiLearningService, { strict: false });
  }

  private get aiConnectedStoresService() {
    return this.moduleRef.get(AiConnectedStoresService, { strict: false });
  }

  async buildContext(
    principal: CurrentPrincipal,
    agentKey: string,
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<CommerceAgentContext> {
    const [
      dataTrust,
      signals,
      dailyBriefResponse,
      recommendations,
      proposalsResponse,
      executionsResponse,
      learningInsightsResponse,
      connectedStoresResponse,
      overviewMetrics,
    ] = await Promise.all([
      this.aiDataTrustService.getTrustForOrganization(organizationId),
      this.aiSignalService.getCanonicalSignals(principal, { organizationId }),
      this.aiDailyBriefService.getDailyBrief(principal, { organizationId }),
      this.aiRecommendationService.getCanonicalRecommendations(principal, { organizationId }),
      this.actionProposalService.listActionProposals(principal, { organizationId }),
      this.aiExecutionService.listExecutions(principal, { organizationId }),
      this.aiLearningService.getLearningInsights(principal, { organizationId }),
      this.aiConnectedStoresService.listConnectedStores(principal, { organizationId }),
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
    ]);

    return {
      organizationId,
      agentKey,
      generatedAt: new Date().toISOString(),
      dataTrust,
      signals,
      dailyBrief: dailyBriefResponse.data,
      recommendations,
      proposals: ((proposalsResponse.data as Array<Record<string, unknown>>) ?? []).slice(0, 8),
      recentExecutions:
        ((executionsResponse.data as Array<Record<string, unknown>>) ?? []).slice(0, 8),
      learningInsights: learningInsightsResponse.data,
      connectedStores:
        ((connectedStoresResponse.data as CommerceAgentContext['connectedStores']) ?? []).slice(
          0,
          4,
        ),
      overviewMetrics,
      inputContext,
    };
  }
}
