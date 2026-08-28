import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class RecommendationDraftingSkill implements AgentSkill {
  readonly id = 'recommendation-drafting';
  readonly name = 'Recommendation Drafting';
  readonly category = 'RECOMMENDATION' as const;
  readonly priority = 50;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return context.retrievalBundle.riskSignals.length > 0 || context.retrievalBundle.operationalMetrics.length > 0;
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const riskMessages = this.skillContextService.getRiskMessages(context.retrievalBundle);
    const riskLevel = context.retrievalBundle.riskSignals.some((signal) => signal.severity === 'HIGH' || signal.severity === 'CRITICAL')
      ? AgentRiskLevel.HIGH
      : AgentRiskLevel.MEDIUM;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: 'Drafted operational recommendations from structured risk and metric evidence.',
      findings: riskMessages.slice(0, 3).length > 0 ? riskMessages.slice(0, 3) : ['No major risk messages found; maintain monitoring.'],
      metrics: context.retrievalBundle.operationalMetrics.slice(0, 3),
      riskLevel,
      recommendations: [
        {
          actionType: 'SEND_NOTIFICATION',
          summary: 'Share a concise operational recommendation summary with responsible operators.',
          targetEntityType: context.entityType ?? null,
          targetEntityId: context.entityId ?? null,
          rationale: 'Operators should receive a structured summary of current risks and next actions.',
          payload: {
            recommendationType: 'SUMMARY',
          },
        },
      ],
      evidence: {
        metricsUsed: context.retrievalBundle.operationalMetrics.slice(0, 5),
      },
    };
  }
}
