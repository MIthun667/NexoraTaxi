import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class ShiftCoverageAnalysisSkill implements AgentSkill {
  readonly id = 'shift-coverage-analysis';
  readonly name = 'Shift Coverage Analysis';
  readonly category = 'ANALYSIS' as const;
  readonly priority = 84;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return ['schedule-shift', 'schedule-plan', 'operational-zone'].includes(context.entityType ?? '');
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const required = Number(this.skillContextService.getEntitySnapshotValue(context, 'capacityRequired') ?? 0);
    const allocated = Number(this.skillContextService.getEntitySnapshotValue(context, 'capacityAllocated') ?? 0);
    const coverage = required > 0 ? Math.round((allocated / required) * 100) : 100;
    const overCapacity = allocated > required && required > 0;
    const riskLevel = coverage < 60 ? AgentRiskLevel.HIGH : coverage < 100 ? AgentRiskLevel.MEDIUM : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: overCapacity
        ? `Shift is over capacity at ${coverage}% allocation.`
        : `Shift coverage is currently ${coverage}% of required staffing.`,
      findings: [
        `Required capacity: ${required}`,
        `Allocated capacity: ${allocated}`,
        ...(overCapacity ? ['The shift is currently over capacity.'] : []),
      ],
      metrics: [
        { key: 'coverage_percent', label: 'Coverage', value: coverage, unit: '%' },
      ],
      riskLevel,
      recommendations:
        coverage < 100
          ? [
              {
                actionType: 'UPDATE_SHIFT_CAPACITY',
                summary: 'Review shift coverage and rebalance staffing to meet required capacity.',
                targetEntityType: context.entityType === 'schedule-shift' ? 'schedule-shift' : null,
                targetEntityId: context.entityType === 'schedule-shift' ? context.entityId ?? null : null,
                rationale: `Coverage is ${coverage}%, below the required operational target.`,
                payload: { coveragePercent: coverage },
              },
            ]
          : [],
      evidence: { required, allocated, coverage, overCapacity },
    };
  }
}
