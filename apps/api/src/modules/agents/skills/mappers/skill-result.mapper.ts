import { Injectable } from '@nestjs/common';

import { SkillExecutionResult } from '../skills.types';
import { SkillExecutionPresenter } from '../presenters/skill-execution.presenter';

@Injectable()
export class SkillResultMapper {
  toPresenter(result: SkillExecutionResult): SkillExecutionPresenter {
    return {
      skillId: result.skillId,
      skillName: result.skillName,
      category: result.category,
      summary: result.summary,
      findings: result.findings,
      metrics: result.metrics,
      riskLevel: result.riskLevel,
      recommendations: result.recommendations,
    };
  }
}
