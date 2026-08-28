import { Injectable } from '@nestjs/common';

import { AgentSkill, AgentSkillContext, SkillRegistryEntry } from './skills.types';
import { AssignmentConflictAnalysisSkill } from './skills/assignment-conflict-analysis.skill';
import { AssetReadinessSkill } from './skills/asset-readiness.skill';
import { ExecutiveSummarySkill } from './skills/executive-summary.skill';
import { IncidentPrioritizationSkill } from './skills/incident-prioritization.skill';
import { RecommendationDraftingSkill } from './skills/recommendation-drafting.skill';
import { RiskSummarySkill } from './skills/risk-summary.skill';
import { ShiftCoverageAnalysisSkill } from './skills/shift-coverage-analysis.skill';
import { StaffingGapDetectionSkill } from './skills/staffing-gap-detection.skill';

@Injectable()
export class SkillsRegistryService {
  private readonly skills: AgentSkill[];

  constructor(
    riskSummarySkill: RiskSummarySkill,
    staffingGapDetectionSkill: StaffingGapDetectionSkill,
    assetReadinessSkill: AssetReadinessSkill,
    incidentPrioritizationSkill: IncidentPrioritizationSkill,
    shiftCoverageAnalysisSkill: ShiftCoverageAnalysisSkill,
    assignmentConflictAnalysisSkill: AssignmentConflictAnalysisSkill,
    executiveSummarySkill: ExecutiveSummarySkill,
    recommendationDraftingSkill: RecommendationDraftingSkill,
  ) {
    this.skills = [
      riskSummarySkill,
      staffingGapDetectionSkill,
      assetReadinessSkill,
      incidentPrioritizationSkill,
      shiftCoverageAnalysisSkill,
      assignmentConflictAnalysisSkill,
      executiveSummarySkill,
      recommendationDraftingSkill,
    ].sort((left, right) => right.priority - left.priority);
  }

  list(): SkillRegistryEntry[] {
    return this.skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      priority: skill.priority,
    }));
  }

  resolve(skillIds?: string[], context?: AgentSkillContext): AgentSkill[] {
    return this.skills.filter((skill) => {
      const matchesId = !skillIds?.length || skillIds.includes(skill.id);
      const matchesContext = !context || skill.supports(context);
      return matchesId && matchesContext;
    });
  }
}
