import { DomainEventProcessingStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { buildCanonicalEvent } from '../../common/events';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import {
  DomainEventDispatchRecord,
  DomainEventPayload,
  PublishDomainEventInput,
} from '../events/domain-events.types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventHandlersService } from './event-handlers.service';

@Injectable()
export class DomainEventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly moduleRef: ModuleRef,
    private readonly logger: PlatformLoggerService,
  ) {}

  async publish(input: PublishDomainEventInput) {
    let persistedEventId: string | null = null;
    const canonicalEvent = buildCanonicalEvent({
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId ?? null,
      organizationId: input.organizationId ?? null,
      sourceModule: input.sourceModule ?? null,
      actorType: input.actorType ?? (input.triggeredByUserId ? 'USER' : null),
      actorId: input.actorId ?? input.triggeredByUserId ?? null,
      payload: (input.payload as Record<string, unknown> | undefined) ?? {},
      metadata: input.metadata ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    });

    try {
      const event = await this.prismaService.domainEvent.create({
        data: {
          organizationId: input.organizationId ?? null,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId ?? null,
          actorType: input.actorType ?? (input.triggeredByUserId ? 'USER' : undefined),
          actorId: input.actorId ?? input.triggeredByUserId ?? null,
          sourceModule: input.sourceModule ?? null,
          payload:
            (input.payload as Prisma.InputJsonValue | undefined) ??
            ({} as Prisma.InputJsonObject),
          metadata:
            ({
              ...(input.metadata ?? {}),
              canonicalEventType: canonicalEvent.canonicalEventType,
              eventCategory: canonicalEvent.eventCategory,
              canonicalEntityType: canonicalEvent.entityType,
              legacyEventType: canonicalEvent.legacyEventType,
            } as Prisma.InputJsonValue | undefined),
          triggeredByUserId: input.triggeredByUserId ?? null,
          occurredAt: input.occurredAt ?? new Date(),
          processingStatus: DomainEventProcessingStatus.PENDING,
          correlationId: input.correlationId ?? null,
          causationId: input.causationId ?? null,
        },
        select: {
          id: true,
          organizationId: true,
          eventType: true,
          aggregateType: true,
          aggregateId: true,
          actorType: true,
          actorId: true,
          sourceModule: true,
          payload: true,
          metadata: true,
          triggeredByUserId: true,
          occurredAt: true,
          publishedAt: true,
          processingStatus: true,
          correlationId: true,
          causationId: true,
        },
      });
      persistedEventId = event.id;

      const eventHandlersService = this.moduleRef.get(EventHandlersService, {
        strict: false,
      });

      await eventHandlersService?.handle({
        ...event,
        payload: (event.payload ?? {}) as DomainEventPayload,
        metadata:
          event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : null,
      } satisfies DomainEventDispatchRecord);

      await this.prismaService.domainEvent.update({
        where: { id: event.id },
        data: {
          publishedAt: new Date(),
          processingStatus: DomainEventProcessingStatus.PROCESSED,
        },
      });

      return event;
    } catch (error) {
      if (persistedEventId) {
        await this.prismaService.domainEvent
          .update({
            where: { id: persistedEventId },
            data: {
              processingStatus: DomainEventProcessingStatus.FAILED,
            },
          })
          .catch(() => null);
      }

      this.logger.warn({
        event: 'domain_event.publish_failed',
        domainEventId: persistedEventId,
        eventType: input.eventType,
        canonicalEventType: canonicalEvent.canonicalEventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId ?? null,
        reason: error instanceof Error ? error.message : 'Unknown domain event failure',
      });
      return null;
    }
  }
}
