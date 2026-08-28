import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class ExecutiveSummarySkill implements AgentSkill {
  readonly id = 'executive-summary';
  readonly name = 'Executive Summary';
  readonly category = 'COMMUNICATION' as const;
  readonly priority = 60;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return context.agentDefinition.code.toLowerCase().includes('executive') || context.agentDefinition.category.toLowerCase().includes('executive');
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const bundleSummary = this.skillContextService.summarizeBundle(context);
    const topRisk = context.retrievalBundle.riskSignals[0]?.severity ?? 'LOW';

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: `Executive context includes ${bundleSummary.relatedEntityCount} linked records, ${bundleSummary.timelineCount} timeline events, and ${bundleSummary.riskSignalCount} active risk signals.`,
      findings: [
        `Highest observed risk level: ${topRisk}`,
        `Context notes available: ${context.retrievalBundle.contextNotes.length}`,
      ],
      metrics: [
        { key: 'executive_related_records', label: 'Related Records', value: bundleSummary.relatedEntityCount },
        { key: 'executive_risk_signals', label: 'Risk Signals', value: bundleSummary.riskSignalCount },
      ],
      riskLevel: topRisk as AgentRiskLevel,
      recommendations: [],
      evidence: {
        contextNotes: context.retrievalBundle.contextNotes.slice(0, 5),
      },
    };
  }
}
