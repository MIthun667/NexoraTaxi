import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus, ConnectorSyncJobStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, ConnectorSyncRequest, ConnectorSyncResult } from '../integrations.types';

@Injectable()
export class EmailConnector implements Connector {
  readonly key = 'email';
  readonly name = 'Email Connector';
  readonly category = ConnectorCategory.COMMUNICATION;
  readonly authType = ConnectorAuthType.API_KEY;
  readonly capabilities = [
    { key: 'sendMessage', description: 'Send a transactional email message.' },
    { key: 'sendTemplateMessage', description: 'Send a templated email message.' },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock email action ${request.actionType} completed successfully.`,
      responsePayload: { delivered: true, channel: 'email' },
      externalRef: `email-${Date.now()}`,
    };
  }

  async runSync(): Promise<ConnectorSyncResult> {
    return { success: true, status: ConnectorSyncJobStatus.SUCCEEDED, summary: 'Email connector does not require sync.', importedCount: 0 };
  }
}
