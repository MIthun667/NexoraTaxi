import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class StaffingGapDetectionSkill implements AgentSkill {
  readonly id = 'staffing-gap-detection';
  readonly name = 'Staffing Gap Detection';
  readonly category = 'ANALYSIS' as const;
  readonly priority = 90;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return ['schedule-shift', 'operational-zone', 'work-order'].includes(context.entityType ?? '');
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const required = Number(this.skillContextService.getEntitySnapshotValue(context, 'capacityRequired') ?? 0);
    const allocated = Number(this.skillContextService.getEntitySnapshotValue(context, 'capacityAllocated') ?? 0);
    const gap = Math.max(required - allocated, 0);
    const understaffed = this.skillContextService.hasRiskSignal(context.retrievalBundle, 'UNDERSTAFFED');
    const riskLevel = gap >= 3 || understaffed ? AgentRiskLevel.HIGH : gap > 0 ? AgentRiskLevel.MEDIUM : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: gap > 0 ? `Staffing gap detected: ${gap} additional resource slot(s) are still needed.` : 'No staffing gap detected for the current context.',
      findings: gap > 0 ? [`Required capacity is ${required} while allocated capacity is ${allocated}.`] : ['Allocated capacity currently matches required capacity.'],
      metrics: [
        { key: 'capacity_required', label: 'Required Capacity', value: required },
        { key: 'capacity_allocated', label: 'Allocated Capacity', value: allocated },
        { key: 'capacity_gap', label: 'Capacity Gap', value: gap },
      ],
      riskLevel,
      recommendations: gap > 0 ? [{
        actionType: 'CREATE_ASSIGNMENT',
        summary: 'Allocate additional workforce coverage to close the staffing gap.',
        targetEntityType: context.entityType ?? null,
        targetEntityId: context.entityId ?? null,
        rationale: `A staffing gap of ${gap} remains for the current operational context.`,
        payload: { capacityGap: gap },
      }] : [],
      evidence: { required, allocated, understaffed },
    };
  }
}
