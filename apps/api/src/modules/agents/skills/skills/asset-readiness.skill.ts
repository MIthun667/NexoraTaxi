import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class AssetReadinessSkill implements AgentSkill {
  readonly id = 'asset-readiness';
  readonly name = 'Asset Readiness';
  readonly category = 'OBSERVATION' as const;
  readonly priority = 85;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return ['asset', 'work-order', 'operational-incident'].includes(context.entityType ?? '') || this.skillContextService.countRelatedEntities(context.retrievalBundle, 'asset') > 0;
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const operationalStatus = String(this.skillContextService.getEntitySnapshotValue(context, 'operationalStatus') ?? 'UNKNOWN');
    const complianceStatus = String(this.skillContextService.getEntitySnapshotValue(context, 'complianceStatus') ?? 'UNKNOWN');
    const maintenanceRisk = this.skillContextService.getRiskMessages(context.retrievalBundle).find((message) => message.toLowerCase().includes('maintenance'));
    const riskLevel =
      operationalStatus === 'OUT_OF_SERVICE' || complianceStatus === 'NON_COMPLIANT'
        ? AgentRiskLevel.HIGH
        : maintenanceRisk
          ? AgentRiskLevel.MEDIUM
          : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: `Asset readiness assessed as ${riskLevel.toLowerCase()} risk based on operational and compliance status.`,
      findings: [
        `Operational status: ${operationalStatus}`,
        `Compliance status: ${complianceStatus}`,
        ...(maintenanceRisk ? [maintenanceRisk] : []),
      ],
      metrics: [
        { key: 'related_asset_count', label: 'Related Assets', value: this.skillContextService.countRelatedEntities(context.retrievalBundle, 'asset') },
      ],
      riskLevel,
      recommendations:
        riskLevel !== AgentRiskLevel.LOW
          ? [
              {
                actionType: 'SCHEDULE_ASSET_MAINTENANCE',
                summary: 'Schedule or prioritize maintenance review for the affected asset.',
                targetEntityType: context.entityType === 'asset' ? 'asset' : null,
                targetEntityId: context.entityType === 'asset' ? context.entityId ?? null : null,
                rationale: 'Asset readiness indicators show elevated operational or compliance risk.',
              },
            ]
          : [],
      evidence: { operationalStatus, complianceStatus, maintenanceRisk },
    };
  }
}
