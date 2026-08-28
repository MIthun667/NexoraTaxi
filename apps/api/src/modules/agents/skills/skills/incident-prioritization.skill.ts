import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { SkillContextService } from '../skill-context.service';
import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from '../skills.types';

@Injectable()
export class IncidentPrioritizationSkill implements AgentSkill {
  readonly id = 'incident-prioritization';
  readonly name = 'Incident Prioritization';
  readonly category = 'DECISION_SUPPORT' as const;
  readonly priority = 88;

  constructor(private readonly skillContextService: SkillContextService) {}

  supports(context: AgentSkillContext): boolean {
    return context.entityType === 'operational-incident' || this.skillContextService.countRelatedEntities(context.retrievalBundle, 'operational-incident') > 0;
  }

  validate(): SkillValidationResult {
    return { isValid: true, reasons: [] };
  }

  async execute(context: AgentSkillContext): Promise<SkillExecutionResult> {
    const severity = String(this.skillContextService.getEntitySnapshotValue(context, 'severity') ?? 'LOW');
    const status = String(this.skillContextService.getEntitySnapshotValue(context, 'status') ?? 'OPEN');
    const riskLevel = severity === 'CRITICAL' ? AgentRiskLevel.CRITICAL : severity === 'HIGH' ? AgentRiskLevel.HIGH : severity === 'MEDIUM' ? AgentRiskLevel.MEDIUM : AgentRiskLevel.LOW;

    return {
      skillId: this.id,
      skillName: this.name,
      category: this.category,
      summary: `Incident priority assessed as ${severity.toLowerCase()} severity with current status ${status.toLowerCase()}.`,
      findings: [
        `Severity is ${severity}.`,
        `Current status is ${status}.`,
      ],
      metrics: [
        { key: 'incident_timeline_events', label: 'Incident Timeline Events', value: this.skillContextService.getTimelineCount(context.retrievalBundle, 'incident.reported') },
      ],
      riskLevel,
      recommendations:
        severity === 'CRITICAL' || severity === 'HIGH'
          ? [
              {
                actionType: 'ESCALATE_INCIDENT',
                summary: 'Escalate the incident for immediate operational response.',
                targetEntityType: 'operational-incident',
                targetEntityId: context.entityId ?? null,
                rationale: `Incident severity ${severity} requires rapid escalation.`,
              },
            ]
          : [],
      evidence: { severity, status },
    };
  }
}
