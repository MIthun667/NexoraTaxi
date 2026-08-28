import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { RequestContextStorage } from '../../common/utils/request-context.util';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  actorUserId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async record(input: AuditLogInput) {
    const requestId = RequestContextStorage.getRequestId();
    const principal = RequestContextStorage.getPrincipal();

    try {
      await this.prismaService.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          organizationId: input.organizationId ?? principal?.organizationId ?? null,
          actorUserId: input.actorUserId ?? principal?.userId ?? null,
          summary: input.summary,
          metadata: input.metadata ?? Prisma.JsonNull,
          requestId: requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn({
        event: 'audit.write_failed',
        requestId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        reason: error instanceof Error ? error.message : 'Unknown audit persistence failure',
      });
    }
  }
}
