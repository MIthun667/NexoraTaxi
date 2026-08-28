import { Injectable } from '@nestjs/common';

import { AgentSkill, AgentSkillContext, SkillExecutionResult, SkillValidationResult } from './skills.types';

@Injectable()
export class SkillValidationService {
  validateSkill(skill: AgentSkill, context: AgentSkillContext): SkillValidationResult {
    return skill.validate(context);
  }

  validateResult(result: SkillExecutionResult): SkillValidationResult {
    const reasons: string[] = [];

    if (!result.summary.trim()) {
      reasons.push('summary_missing');
    }

    if (!Array.isArray(result.findings)) {
      reasons.push('findings_invalid');
    }

    if (!Array.isArray(result.metrics)) {
      reasons.push('metrics_invalid');
    }

    if (!Array.isArray(result.recommendations)) {
      reasons.push('recommendations_invalid');
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }
}
