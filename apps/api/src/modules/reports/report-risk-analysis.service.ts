import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { ReportEvidenceBundle } from './reports.types';

@Injectable()
export class ReportRiskAnalysisService {
  // TODO(universal-signals): replace free-form findings and risk extraction with CanonicalSignal-aware evidence mapping once reports adopt shared signal contracts.
  // TODO(agent-insights): package report findings and recommendation summaries as AgentInsight-compatible bundles once reports move beyond free-form arrays.
  // TODO(recommendations): convert free-form report recommendations into Recommendation-compatible structures once reports consume insight-derived next steps.
  resolveRiskLevel(evidence: ReportEvidenceBundle, fallback: AgentRiskLevel = AgentRiskLevel.LOW): AgentRiskLevel {
    const proposalRisks = evidence.proposals.map((proposal) => String(proposal.riskLevel ?? 'LOW'));
    const verificationFailures = evidence.verificationResults.filter((item) => item.verificationStatus === 'FAILED').length;

    if (proposalRisks.includes('CRITICAL')) {
      return AgentRiskLevel.CRITICAL;
    }

    if (proposalRisks.includes('HIGH') || verificationFailures > 0) {
      return AgentRiskLevel.HIGH;
    }

    if (proposalRisks.includes('MEDIUM')) {
      return AgentRiskLevel.MEDIUM;
    }

    return fallback;
  }

  extractFindings(evidence: ReportEvidenceBundle): string[] {
    return [
      ...evidence.decisions.slice(0, 3).map((decision) => String(decision.summary)),
      ...evidence.proposals.slice(0, 3).map((proposal) => String(proposal.summary)),
      ...evidence.verificationResults.slice(0, 2).map((verification) => String(verification.summary)),
    ].filter(Boolean);
  }
}
