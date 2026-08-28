import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';

import { DomainEventsService } from '../notifications/domain-events.service';
import { AlertingService } from '../observability/alerting.service';
import { PlanEnforcementService } from '../tenancy/plan-enforcement.service';
import { ConnectorAuthService } from './connector-auth.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorsRepository } from './connectors.repository';
import { ConnectorInstanceContext, WebhookEventEnvelope } from './integrations.types';

@Injectable()
export class ConnectorWebhooksService {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorRegistryService: ConnectorRegistryService,
    private readonly connectorAuthService: ConnectorAuthService,
    private readonly domainEventsService: DomainEventsService,
    private readonly alertingService: AlertingService,
    private readonly planEnforcementService: PlanEnforcementService,
  ) {}

  async ingest(instanceId: string, headers: Record<string, string | string[] | undefined>, payload: Record<string, unknown>) {
    const instance = await this.connectorsRepository.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException('Connector instance not found.');
    }
    if (instance.organizationId) {
      await this.planEnforcementService.assertFeatureEnabled(instance.organizationId, 'integrations');
    }

    const connector = this.connectorRegistryService.getConnector(instance.connectorDefinition.key);
    if (!connector.handleWebhook) {
      throw new ForbiddenException('This connector does not support webhook ingestion.');
    }

    const context = this.toContext(instance);
    try {
      this.assertWebhookSignature(headers, payload, context);
    } catch (error) {
      await this.alertingService.raiseAlert({
        organizationId: instance.organizationId ?? null,
        sourceModule: 'integrations',
        alertType: 'webhook.signature.failure',
        severity: 'WARNING',
        title: 'Webhook signature validation failed',
        summary: error instanceof Error ? error.message : 'Webhook signature validation failed.',
        metadata: {
          connectorInstanceId: instance.id,
        },
      });
      throw error;
    }

    const normalized = await connector.handleWebhook(context, {
      organizationId: instance.organizationId ?? null,
      connectorInstanceId: instance.id,
      eventType: 'external.webhook.received',
      payload,
      headers,
      receivedAt: new Date(),
      idempotencyKey: (() => {
        const headerValue = headers['x-idempotency-key'] ?? headers['x-event-id'];
        const normalizedValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
        return normalizedValue ? String(normalizedValue) : null;
      })(),
    } satisfies WebhookEventEnvelope);

    await this.domainEventsService.publish({
      organizationId: instance.organizationId ?? null,
      eventType: normalized.normalizedEventType,
      aggregateType: 'connector-instance',
      aggregateId: instance.id,
      sourceModule: 'integrations',
      payload: normalized.payload,
    });

    return normalized;
  }

  private assertWebhookSignature(headers: Record<string, string | string[] | undefined>, payload: Record<string, unknown>, context: ConnectorInstanceContext) {
    const secret = context.credentials.find((credential) => credential.type === 'WEBHOOK_SECRET')?.secret;
    if (!secret) {
      return;
    }

    const signatureHeader = headers['x-webhook-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) {
      throw new ForbiddenException('Missing webhook signature.');
    }

    const digest = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const left = Buffer.from(signature);
    const right = Buffer.from(digest);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new ForbiddenException('Invalid webhook signature.');
    }
  }

  private toContext(instance: NonNullable<Awaited<ReturnType<ConnectorsRepository['findInstanceById']>>>): ConnectorInstanceContext {
    return {
      id: instance.id,
      organizationId: instance.organizationId ?? null,
      displayName: instance.displayName,
      status: instance.status,
      definition: {
        id: instance.connectorDefinition.id,
        key: instance.connectorDefinition.key,
        name: instance.connectorDefinition.name,
        category: instance.connectorDefinition.category,
        authType: instance.connectorDefinition.authType,
        capabilities: instance.connectorDefinition.capabilities,
      },
      configuration:
        instance.configuration && typeof instance.configuration === 'object' && !Array.isArray(instance.configuration)
          ? (instance.configuration as Record<string, unknown>)
          : null,
      credentials: instance.credentials.map((credential) => ({
        type: credential.credentialType,
        secret: this.connectorAuthService.decryptSecret(credential.encryptedSecret),
        expiresAt: credential.expiresAt,
      })),
    };
  }
}
