import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class AssignmentConflictAnalysisSkill implements AgentSkill {
  readonly id = 'assignment-conflict-analysis';
  readonly name = 'Assignment Conflict Analysis';
  readonly category = 'DECISION_SUPPORT' as const;
  readonly priority = 86;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return ['resource-assignment', 'workforce-member', 'asset', 'work-order'].includes(context.entityType ?? '') || this.skillContextService.getRiskMessages(context.retrievalBundle).some((message) => message.toLowerCase().includes('conflict'));
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const conflictSignals = context.retrievalBundle.riskSignals.filter((signal) => signal.code.includes('CONFLICT') || signal.message.toLowerCase().includes('conflict'));
    const activeAssignments = this.skillContextService.countRelatedEntities(context.retrievalBundle, 'resource-assignment');
    const riskLevel = conflictSignals.length > 0 ? AgentRiskLevel.HIGH : activeAssignments > 3 ? AgentRiskLevel.MEDIUM : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: conflictSignals.length > 0 ? `${conflictSignals.length} assignment conflict signal(s) detected.` : 'No explicit assignment conflicts detected.',
      findings: conflictSignals.length > 0 ? conflictSignals.map((signal) => signal.message) : ['Assignments appear stable in the current context.'],
      metrics: [
        { key: 'active_assignment_links', label: 'Active Assignment Links', value: activeAssignments },
      ],
      riskLevel,
      recommendations:
        conflictSignals.length > 0
          ? [
              {
                actionType: 'RELEASE_ASSIGNMENT',
                summary: 'Review and release or rebalance conflicting assignments.',
                targetEntityType: context.entityType ?? null,
                targetEntityId: context.entityId ?? null,
                rationale: 'Active assignment conflict signals indicate a likely resource collision.',
              },
            ]
          : [],
      evidence: { conflictSignals },
    };
  }
}
