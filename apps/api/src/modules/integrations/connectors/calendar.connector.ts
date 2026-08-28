import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus, ConnectorSyncJobStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, ConnectorSyncRequest, ConnectorSyncResult } from '../integrations.types';

@Injectable()
export class CalendarConnector implements Connector {
  readonly key = 'calendar';
  readonly name = 'Calendar Connector';
  readonly category = ConnectorCategory.CALENDAR;
  readonly authType = ConnectorAuthType.OAUTH2;
  readonly capabilities = [
    { key: 'createEvent', description: 'Create a calendar event.' },
    { key: 'updateEvent', description: 'Update a calendar event.' },
    { key: 'cancelEvent', description: 'Cancel a calendar event.' },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock calendar action ${request.actionType} executed.`,
      responsePayload: { scheduled: true },
      externalRef: `calendar-${Date.now()}`,
    };
  }

  async runSync(_context: ConnectorInstanceContext, request: ConnectorSyncRequest): Promise<ConnectorSyncResult> {
    return {
      success: true,
      status: ConnectorSyncJobStatus.SUCCEEDED,
      summary: `Calendar sync job ${request.jobType} completed.`,
      importedCount: 4,
      checkpoint: { syncedAt: new Date().toISOString() },
    };
  }
}
