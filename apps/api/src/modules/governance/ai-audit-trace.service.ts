import { Injectable, NotFoundException } from '@nestjs/common';

import { GovernanceRepository } from './governance.repository';
import { AgentDecisionTrace } from './governance.types';

@Injectable()
export class AiAuditTraceService {
  constructor(private readonly governanceRepository: GovernanceRepository) {}

  async getRunTrace(agentRunId: string): Promise<AgentDecisionTrace> {
    const run = await this.governanceRepository.findRunTrace(agentRunId);
    if (!run) {
      throw new NotFoundException('Agent run trace not found.');
    }

    return {
      runId: run.id,
      organizationId: run.organizationId ?? null,
      status: run.status,
      summary: run.summary ?? null,
      observations: run.observations,
      decisions: run.decisions,
      proposals: run.actionProposals,
      verificationResults: run.verificationResults,
      policyViolations: run.policyViolations,
      executionMetrics: run.executionMetrics,
      operationalImpacts: run.operationalImpacts,
      inferenceAuditLogs: run.inferenceAuditLogs,
    };
  }
}
