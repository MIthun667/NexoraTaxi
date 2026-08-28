import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DomainEventsService } from '../notifications/domain-events.service';
import { LoggingService } from './logging.service';
import { AlertEvent } from './observability.types';
import { ObservabilityRepository } from './observability.repository';

@Injectable()
export class AlertingService {
  constructor(
    private readonly observabilityRepository: ObservabilityRepository,
    private readonly domainEventsService: DomainEventsService,
    private readonly loggingService: LoggingService,
  ) {}

  async raiseAlert(input: AlertEvent) {
    const existing = await this.observabilityRepository.findOpenAlertByType(
      input.organizationId ?? null,
      input.sourceModule,
      input.alertType,
    );

    if (existing) {
      await this.observabilityRepository.updateAlert(existing.id, {
        summary: input.summary,
        severity: input.severity,
        metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        correlationId: input.correlationId ?? null,
        status: 'OPEN',
        resolvedAt: null,
        resolvedByUserId: null,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        triggeredAt: new Date(),
      });
      return existing;
    }

    const alert = await this.observabilityRepository.createAlert({
      organizationId: input.organizationId ?? null,
      sourceModule: input.sourceModule,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      correlationId: input.correlationId ?? null,
    });

    this.loggingService.warn({
      event: 'observability.alert.raised',
      organizationId: input.organizationId ?? null,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
    });

    await this.domainEventsService.publish({
      organizationId: input.organizationId ?? null,
      eventType: 'system.alert.raised',
      aggregateType: 'system-alert',
      aggregateId: alert.id,
      sourceModule: 'observability',
      payload: {
        alertType: input.alertType,
        severity: input.severity,
        title: input.title,
        summary: input.summary,
      },
    });

    return alert;
  }
}
