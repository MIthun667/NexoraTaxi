import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class RiskSummarySkill implements AgentSkill {
  readonly id = 'risk-summary';
  readonly name = 'Risk Summary';
  readonly category = 'ANALYSIS' as const;
  readonly priority = 100;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return context.retrievalBundle.riskSignals.length > 0 || context.retrievalBundle.timelineEvents.length > 0;
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const topSignals = context.retrievalBundle.riskSignals.slice(0, 3);
    const riskLevel = topSignals.some((signal) => signal.severity === 'CRITICAL')
      ? AgentRiskLevel.CRITICAL
      : topSignals.some((signal) => signal.severity === 'HIGH')
        ? AgentRiskLevel.HIGH
        : topSignals.some((signal) => signal.severity === 'MEDIUM')
          ? AgentRiskLevel.MEDIUM
          : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary:
        topSignals.length > 0
          ? `${topSignals.length} active risk signal(s) detected for the current operational context.`
          : 'No explicit risk signals detected in the current context.',
      findings: topSignals.length > 0 ? topSignals.map((signal) => signal.message) : ['No explicit risk signals present.'],
      metrics: [
        {
          key: 'risk_signal_count',
          label: 'Risk Signals',
          value: context.retrievalBundle.riskSignals.length,
        },
        {
          key: 'timeline_event_count',
          label: 'Timeline Events',
          value: this.skillContextService.summarizeBundle(context).timelineCount,
        },
      ],
      riskLevel,
      recommendations:
        riskLevel === AgentRiskLevel.HIGH || riskLevel === AgentRiskLevel.CRITICAL
          ? [
              {
                actionType: 'SEND_NOTIFICATION',
                summary: 'Alert responsible operators about the current high-risk state.',
                targetEntityType: context.entityType ?? null,
                targetEntityId: context.entityId ?? null,
                rationale: 'High-severity risk signals are present in the retrieved operational context.',
              },
            ]
          : [],
      evidence: {
        riskSignals: topSignals,
      },
    };
  }
}
