import { AgentVerificationStatus, AgentVerificationType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { VerificationOutcome, VerificationRequest } from './verification.types';

@Injectable()
export class StateVerifierService {
  constructor(private readonly prismaService: PrismaService) {}

  async verify(request: VerificationRequest): Promise<VerificationOutcome> {
    let observedState: Record<string, unknown> | null = null;
    let passed = false;

    switch (request.actionType) {
      case 'CREATE_WORK_ORDER': {
        const workOrder = request.targetEntityId
          ? await this.prismaService.workOrder.findUnique({ where: { id: request.targetEntityId } })
          : null;
        observedState = workOrder ? { id: workOrder.id, status: workOrder.status, priority: workOrder.priority } : null;
        passed = !!workOrder;
        break;
      }
      case 'ESCALATE_INCIDENT': {
        const incident = request.targetEntityId
          ? await this.prismaService.operationalIncident.findUnique({ where: { id: request.targetEntityId } })
          : null;
        const incidentAction = request.targetEntityId
          ? await this.prismaService.incidentAction.findFirst({ where: { incidentId: request.targetEntityId, actionType: 'ESCALATE' }, orderBy: { performedAt: 'desc' } })
          : null;
        observedState = {
          incidentStatus: incident?.status ?? null,
          lastEscalationAt: incidentAction?.performedAt ?? null,
        };
        passed = !!incidentAction;
        break;
      }
      case 'ASSIGN_WORKFORCE_TO_SHIFT':
      case 'CREATE_ASSIGNMENT': {
        const assignment = request.targetEntityId
          ? await this.prismaService.resourceAssignment.findUnique({ where: { id: request.targetEntityId } })
          : null;
        observedState = assignment
          ? { id: assignment.id, status: assignment.status, shiftId: assignment.shiftId, workforceMemberId: assignment.workforceMemberId }
          : null;
        passed = !!assignment;
        break;
      }
      case 'SCHEDULE_ASSET_MAINTENANCE': {
        const maintenance = request.targetEntityId
          ? await this.prismaService.assetMaintenanceRecord.findUnique({ where: { id: request.targetEntityId } })
          : null;
        observedState = maintenance
          ? { id: maintenance.id, status: maintenance.status, assetId: maintenance.assetId }
          : null;
        passed = !!maintenance;
        break;
      }
      default:
        observedState = {
          targetEntityType: request.targetEntityType ?? null,
          targetEntityId: request.targetEntityId ?? null,
        };
        passed = !!request.targetEntityId;
        break;
    }

    return {
      verificationType: AgentVerificationType.STATE,
      verificationStatus: passed ? AgentVerificationStatus.PASSED : AgentVerificationStatus.FAILED,
      summary: passed
        ? `State verification passed for ${request.actionType}.`
        : `State verification failed for ${request.actionType}.`,
      expectedState: (request.expectedState ?? null) as never,
      observedState: (observedState ?? null) as never,
      details: {
        actionType: request.actionType,
      } as never,
    };
  }
}
