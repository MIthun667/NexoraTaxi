import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class ActionAuditService {
  constructor(private readonly auditService: AuditService) {}

  record(action: string, input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    proposalId: string;
    summary: string;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.auditService.record({
      action,
      entityType: 'agent-action-proposal',
      entityId: input.proposalId,
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
      summary: input.summary,
      metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
    });
  }
}
