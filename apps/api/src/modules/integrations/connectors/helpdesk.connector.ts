import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus, ConnectorSyncJobStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, ConnectorSyncRequest, ConnectorSyncResult } from '../integrations.types';

@Injectable()
export class HelpdeskConnector implements Connector {
  readonly key = 'helpdesk';
  readonly name = 'Helpdesk Connector';
  readonly category = ConnectorCategory.BUSINESS_SYSTEM;
  readonly authType = ConnectorAuthType.API_KEY;
  readonly capabilities = [
    { key: 'createTicket', description: 'Create a helpdesk ticket.' },
    { key: 'updateTicket', description: 'Update a helpdesk ticket.' },
    { key: 'fetchTicketStatus', description: 'Fetch ticket state.', supportsSync: true },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock helpdesk action ${request.actionType} completed.`,
      responsePayload: { ticketCreated: true },
      externalRef: `helpdesk-${Date.now()}`,
    };
  }

  async runSync(_context: ConnectorInstanceContext, request: ConnectorSyncRequest): Promise<ConnectorSyncResult> {
    return {
      success: true,
      status: ConnectorSyncJobStatus.SUCCEEDED,
      summary: `Helpdesk sync job ${request.jobType} completed.`,
      importedCount: 8,
      checkpoint: { lastTicketId: 'hd-008' },
    };
  }
}
