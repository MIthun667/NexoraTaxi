import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkflowAuditService {
  constructor(private readonly auditService: AuditService) {}

  async recordProposalLifecycle(input: {
    organizationId: string;
    proposalId: string;
    actorUserId: string;
    action: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.auditService.record({
      action: input.action,
      entityType: 'action_proposal',
      entityId: input.proposalId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      summary: input.summary,
      metadata: input.metadata,
    });
  }
}
