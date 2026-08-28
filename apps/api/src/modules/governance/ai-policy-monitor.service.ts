import { Injectable } from '@nestjs/common';

import { PolicyViolationRecord } from './governance.types';
import { GovernanceRepository } from './governance.repository';

@Injectable()
export class AiPolicyMonitorService {
  constructor(private readonly governanceRepository: GovernanceRepository) {}

  recordViolation(input: PolicyViolationRecord) {
    return this.governanceRepository.createPolicyViolation({
      ...(input.organizationId
        ? { organization: { connect: { id: input.organizationId } } }
        : {}),
      agentRun: { connect: { id: input.agentRunId } },
      ...(input.policyRuleId ? { policyRule: { connect: { id: input.policyRuleId } } } : {}),
      violationType: input.violationType,
      severity: input.severity,
      description: input.description,
      metadata: input.metadata,
    });
  }
}
