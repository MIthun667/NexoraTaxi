import { Module } from '@nestjs/common';

import { SkillContextService } from './skill-context.service';
import { SkillRunnerService } from './skill-runner.service';
import { SkillValidationService } from './skill-validation.service';
import { SkillsRegistryService } from './skills-registry.service';
import { AssignmentConflictAnalysisSkill } from './skills/assignment-conflict-analysis.skill';
import { AssetReadinessSkill } from './skills/asset-readiness.skill';
import { ExecutiveSummarySkill } from './skills/executive-summary.skill';
import { IncidentPrioritizationSkill } from './skills/incident-prioritization.skill';
import { RecommendationDraftingSkill } from './skills/recommendation-drafting.skill';
import { RiskSummarySkill } from './skills/risk-summary.skill';
import { ShiftCoverageAnalysisSkill } from './skills/shift-coverage-analysis.skill';
import { StaffingGapDetectionSkill } from './skills/staffing-gap-detection.skill';

@Module({
  providers: [
    SkillContextService,
    SkillValidationService,
    SkillsRegistryService,
    SkillRunnerService,
    RiskSummarySkill,
    StaffingGapDetectionSkill,
    AssetReadinessSkill,
    IncidentPrioritizationSkill,
    ShiftCoverageAnalysisSkill,
    AssignmentConflictAnalysisSkill,
    ExecutiveSummarySkill,
    RecommendationDraftingSkill,
  ],
  exports: [SkillRunnerService, SkillsRegistryService],
})
export class SkillsModule {}
