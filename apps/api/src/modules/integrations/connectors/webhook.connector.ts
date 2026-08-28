import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, WebhookEventEnvelope } from '../integrations.types';

@Injectable()
export class WebhookConnector implements Connector {
  readonly key = 'webhook';
  readonly name = 'Webhook Connector';
  readonly category = ConnectorCategory.OPERATIONAL;
  readonly authType = ConnectorAuthType.WEBHOOK_SECRET;
  readonly capabilities = [
    { key: 'postOutboundWebhook', description: 'Send an outbound webhook.' },
    { key: 'receiveInboundWebhook', description: 'Receive inbound webhook events.', supportsWebhook: true },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock webhook action ${request.actionType} dispatched.`,
      responsePayload: { delivered: true },
      externalRef: `webhook-${Date.now()}`,
    };
  }

  async handleWebhook(_context: ConnectorInstanceContext, envelope: WebhookEventEnvelope) {
    return {
      normalizedEventType: 'connector.webhook.received',
      payload: {
        connectorInstanceId: envelope.connectorInstanceId,
        sourceEventType: envelope.eventType,
        body: envelope.payload,
      },
    };
  }
}
