import { Injectable } from '@nestjs/common';
import {
  AgentActionProposalStatus,
  AgentRiskLevel,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface ProposedAgentActionInput {
  actionType: string;
  payload?: Prisma.InputJsonValue;
  summary: string;
  targetEntityId?: string | null;
  targetEntityType?: string | null;
}

export interface EvaluatedAgentAction extends ProposedAgentActionInput {
  requiresApproval: boolean;
  riskLevel: AgentRiskLevel;
  status: AgentActionProposalStatus;
}

const defaultPolicyMap: Record<
  string,
  { isEnabled: boolean; requiresApproval: boolean; riskLevel: AgentRiskLevel }
> = {
  CREATE_SUMMARY_REPORT: {
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    isEnabled: true,
  },
  CREATE_RECOMMENDATION: {
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    isEnabled: true,
  },
  CREATE_WORKFLOW_TASK: {
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: true,
    isEnabled: true,
  },
  CONNECT_STRIPE: {
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: true,
    isEnabled: true,
  },
  RUN_SHOPIFY_SYNC: {
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: true,
    isEnabled: true,
  },
  ESCALATE_APPROVAL_REQUEST: {
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: true,
    isEnabled: true,
  },
  ESCALATE_DISPATCH_INCIDENT: {
    // TODO(universal-action-proposals): rename to an operational-incident abstraction once proposal/action constants are fully normalized.
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: true,
    isEnabled: true,
  },
  DRIVER_COMPLIANCE_REVIEW: {
    // TODO(universal-action-proposals): migrate this driver-specific proposal to a people/workforce compliance action name.
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: true,
    isEnabled: true,
  },
  FLEET_COMPLIANCE_REVIEW: {
    // TODO(universal-action-proposals): migrate this fleet-specific proposal to a universal asset compliance action name.
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: true,
    isEnabled: true,
  },
  SUSPEND_DRIVER: {
    // TODO(universal-action-proposals): replace with a role-neutral people suspension proposal when compatibility layers are ready.
    riskLevel: AgentRiskLevel.HIGH,
    requiresApproval: true,
    isEnabled: true,
  },
  BLOCK_FLEET_VEHICLE: {
    // TODO(universal-action-proposals): replace with a universal asset blocking proposal when legacy fleet language is retired.
    riskLevel: AgentRiskLevel.HIGH,
    requiresApproval: true,
    isEnabled: true,
  },
  CANCEL_ACTIVE_DISPATCH_RUN: {
    // TODO(universal-action-proposals): converge this dispatch-run action into an operational-task cancellation proposal.
    riskLevel: AgentRiskLevel.CRITICAL,
    requiresApproval: true,
    isEnabled: false,
  },
};

@Injectable()
export class AgentPolicyService {
  constructor(private readonly prismaService: PrismaService) {}

  async evaluate(
    agentDefinitionId: string,
    proposal: ProposedAgentActionInput,
  ): Promise<EvaluatedAgentAction> {
    const override = await this.prismaService.agentPolicyRule.findFirst({
      where: {
        actionType: proposal.actionType,
        OR: [
          { agentDefinitionId },
          { agentDefinitionId: null },
        ],
      },
      orderBy: [{ agentDefinitionId: 'desc' }],
      select: {
        riskLevel: true,
        requiresApproval: true,
        isEnabled: true,
      },
    });

    const basePolicy = override ?? defaultPolicyMap[proposal.actionType] ?? {
      riskLevel: AgentRiskLevel.MEDIUM,
      requiresApproval: true,
      isEnabled: true,
    };

    const status = !basePolicy.isEnabled
      ? AgentActionProposalStatus.CANCELLED
      : basePolicy.requiresApproval
        ? AgentActionProposalStatus.APPROVAL_REQUIRED
        : AgentActionProposalStatus.PROPOSED;

    return {
      ...proposal,
      requiresApproval: basePolicy.requiresApproval,
      riskLevel: basePolicy.riskLevel,
      status,
    };
  }
}
