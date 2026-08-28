import { AgentVerificationStatus, AgentVerificationType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { VerificationOutcome, OutcomeEvaluationRequest } from './verification.types';

@Injectable()
export class OutcomeVerifierService {
  constructor(private readonly prismaService: PrismaService) {}

  async verify(request: OutcomeEvaluationRequest): Promise<VerificationOutcome> {
    let status: AgentVerificationStatus = AgentVerificationStatus.PARTIAL;
    let summary = `Outcome verification is pending for ${request.actionType}.`;
    let observedState: Record<string, unknown> = {};

    if (request.actionType === 'ASSIGN_WORKFORCE_TO_SHIFT' && request.targetEntityId) {
      const shift = await this.prismaService.scheduleShift.findUnique({
        where: { id: request.targetEntityId },
        select: { id: true, capacityRequired: true, capacityAllocated: true },
      });

      observedState = {
        shiftId: shift?.id ?? null,
        capacityRequired: shift?.capacityRequired ?? null,
        capacityAllocated: shift?.capacityAllocated ?? null,
      };

      if (shift && shift.capacityRequired !== null && shift.capacityAllocated !== null) {
        if (shift.capacityAllocated >= shift.capacityRequired) {
          status = AgentVerificationStatus.PASSED;
          summary = 'Shift coverage target is satisfied after assignment.';
        } else {
          status = AgentVerificationStatus.PARTIAL;
          summary = 'Assignment succeeded, but the shift remains understaffed.';
        }
      }
    }

    if (request.actionType === 'ESCALATE_INCIDENT' && request.targetEntityId) {
      const approvalCount = await this.prismaService.approvalRequest.count({
        where: {
          organizationId: request.organizationId,
          entityType: 'agent-action-proposal',
          entityId: request.targetEntityId,
        },
      });
      observedState = { approvalCount };
      status = approvalCount > 0 ? AgentVerificationStatus.PASSED : AgentVerificationStatus.PARTIAL;
      summary = approvalCount > 0
        ? 'Incident escalation created downstream governance activity.'
        : 'Incident escalation succeeded but no downstream approval/workflow signal was observed.';
    }

    return {
      verificationType: AgentVerificationType.OUTCOME,
      verificationStatus: status,
      summary,
      observedState: observedState as never,
      details: {
        actionType: request.actionType,
      } as never,
    };
  }
}
