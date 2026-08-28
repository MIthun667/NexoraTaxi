import { AgentConfidenceLevel, AgentDecisionType, AgentObservationType, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { RequestContextStorage } from '../../../common/utils/request-context.util';
import { RetrievalService } from '../../retrieval/retrieval.service';
import { SkillRunnerService } from '../skills/skill-runner.service';
import { ActionProposalRequest, AgentReasoningResult, ReasoningContext } from './reasoning.types';
import { DecisionValidatorService } from './decision-validator.service';
import { LlmRunnerService } from './llm-runner.service';
import { PolicyEvaluatorService } from './policy-evaluator.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ResponseParserService } from './response-parser.service';

@Injectable()
export class ReasoningOrchestratorService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly llmRunnerService: LlmRunnerService,
    private readonly responseParserService: ResponseParserService,
    private readonly decisionValidatorService: DecisionValidatorService,
    private readonly policyEvaluatorService: PolicyEvaluatorService,
    private readonly skillRunnerService: SkillRunnerService,
  ) {}

  async run(input: {
    agentDefinition: { id: string; code: string; name: string; category: string };
    agentRunId: string;
    organizationId: string;
    entityType?: string | null;
    entityId?: string | null;
    inputContext?: Record<string, unknown> | null;
  }): Promise<AgentReasoningResult> {
    const retrievalBundle = await this.retrievalService.retrieveForAgentRun({
      organizationId: input.organizationId,
      agentId: input.agentDefinition.id,
      agentRunId: input.agentRunId,
      targetEntityType: input.entityType ?? 'work-order',
      targetEntityId: input.entityId ?? null,
      retrievalTypes: ['STATE', 'HISTORY', 'ANALYTICS', 'RISK', 'TIMELINE'],
      metadata: {
        source: 'reasoning-orchestrator',
        requestId: RequestContextStorage.getRequestId() ?? null,
      },
    });

    const context: ReasoningContext = {
      agentDefinition: input.agentDefinition,
      agentRunId: input.agentRunId,
      organizationId: input.organizationId,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      retrievalBundle,
      inputContext: input.inputContext ?? null,
    };

    const skillResults = await this.skillRunnerService.run({
      context: {
        organizationId: input.organizationId,
        agentRunId: input.agentRunId,
        agentDefinition: input.agentDefinition,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        retrievalBundle,
        inputContext: input.inputContext ?? null,
      },
    });

    context.skillResults = skillResults;

    const prompt = this.promptBuilderService.buildPrompt(context);
    const llmResponse = await this.llmRunnerService.run(context, prompt);
    const parsed = this.responseParserService.parse(llmResponse.content);
    const validation = this.decisionValidatorService.validate(parsed, context);

    const proposals = this.mapRecommendationsToProposals(validation.normalizedOutput.recommended_actions, context);
    const evaluatedPolicies = await this.policyEvaluatorService.evaluate(
      input.agentDefinition.id,
      proposals,
    );

    return {
      summary: validation.normalizedOutput.summary,
      observations: [
        {
          observationType: AgentObservationType.CONTEXT_GATHERED,
          summary: `Retrieved ${retrievalBundle.relatedEntities.length} related entities, ${retrievalBundle.timelineEvents.length} timeline events, and ${skillResults.length} reusable skill analyses.`,
          metadata: retrievalBundle as unknown as Prisma.InputJsonValue,
        },
        ...skillResults.map((skillResult) => ({
          observationType: AgentObservationType.CONTEXT_GATHERED,
          summary: `${skillResult.skillName}: ${skillResult.summary}`,
          metadata: {
            skillId: skillResult.skillId,
            category: skillResult.category,
            findings: skillResult.findings,
            metrics: skillResult.metrics,
            riskLevel: skillResult.riskLevel,
          } as Prisma.InputJsonValue,
        })),
        {
          observationType: AgentObservationType.POLICY_CHECKED,
          summary: `${evaluatedPolicies.length} recommended actions were evaluated against policy rules.`,
          metadata: {
            warnings: validation.warnings,
          } as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: this.mapRiskLevelToDecisionType(validation.normalizedOutput.risk_level),
          summary: validation.normalizedOutput.summary,
          confidence: this.mapConfidence(validation.normalizedOutput.confidence),
          metadata: {
            findings: validation.normalizedOutput.findings,
            riskLevel: validation.normalizedOutput.risk_level,
            warnings: validation.warnings,
            skillResults: skillResults.map((skillResult) => ({
              skillId: skillResult.skillId,
              summary: skillResult.summary,
              riskLevel: skillResult.riskLevel,
            })),
          } as Prisma.InputJsonValue,
        },
      ],
      proposals,
    };
  }

  private mapRecommendationsToProposals(
    recommendations: ReasoningContext extends never ? never : import('./reasoning.types').AgentRecommendation[],
    context: ReasoningContext,
  ): ActionProposalRequest[] {
    const skillRecommendations =
      context.skillResults?.flatMap((skillResult) =>
        skillResult.recommendations.map((recommendation) => ({
          action_type: recommendation.actionType,
          summary: recommendation.summary,
          target_entity_type: recommendation.targetEntityType ?? null,
          target_entity_id: recommendation.targetEntityId ?? null,
          rationale: recommendation.rationale ?? null,
          payload: recommendation.payload ?? null,
        })),
      ) ?? [];

    return [...skillRecommendations, ...recommendations].map((recommendation) => ({
      actionType: recommendation.action_type,
      summary: recommendation.summary,
      targetEntityType: recommendation.target_entity_type ?? context.entityType ?? null,
      targetEntityId: recommendation.target_entity_id ?? context.entityId ?? null,
      payload: {
        rationale: recommendation.rationale ?? null,
        payload: recommendation.payload ?? null,
        source: 'reasoning-engine',
        agentRunId: context.agentRunId,
      } as Prisma.InputJsonValue,
    }));
  }

  private mapConfidence(confidence: number): AgentConfidenceLevel {
    if (confidence >= 0.8) {
      return AgentConfidenceLevel.HIGH;
    }

    if (confidence >= 0.5) {
      return AgentConfidenceLevel.MEDIUM;
    }

    return AgentConfidenceLevel.LOW;
  }

  private mapRiskLevelToDecisionType(riskLevel: string): AgentDecisionType {
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      return AgentDecisionType.RISK_ASSESSMENT;
    }

    return AgentDecisionType.RECOMMENDATION;
  }
}
