import { Injectable } from '@nestjs/common';

import { SkillValidationService } from './skill-validation.service';
import { SkillsRegistryService } from './skills-registry.service';
import { SkillExecutionRequest, SkillExecutionResult } from './skills.types';

@Injectable()
export class SkillRunnerService {
  constructor(
    private readonly skillsRegistryService: SkillsRegistryService,
    private readonly skillValidationService: SkillValidationService,
  ) {}

  async run(request: SkillExecutionRequest): Promise<SkillExecutionResult[]> {
    const skills = this.skillsRegistryService.resolve(request.skillIds, request.context);
    const results: SkillExecutionResult[] = [];

    for (const skill of skills) {
      const validation = this.skillValidationService.validateSkill(skill, request.context);
      if (!validation.isValid) {
        continue;
      }

      const result = await skill.execute(request.context);
      const resultValidation = this.skillValidationService.validateResult(result);
      if (!resultValidation.isValid) {
        continue;
      }

      results.push(result);
    }

    return results.sort((left, right) => {
      const leftScore = left.recommendations.length + left.findings.length;
      const rightScore = right.recommendations.length + right.findings.length;
      return rightScore - leftScore;
    });
  }
}
