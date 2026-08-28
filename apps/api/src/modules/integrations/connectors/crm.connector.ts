import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus, ConnectorSyncJobStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, ConnectorSyncRequest, ConnectorSyncResult } from '../integrations.types';

@Injectable()
export class CrmConnector implements Connector {
  readonly key = 'crm';
  readonly name = 'CRM Connector';
  readonly category = ConnectorCategory.BUSINESS_SYSTEM;
  readonly authType = ConnectorAuthType.OAUTH2;
  readonly capabilities = [
    { key: 'createLead', description: 'Create a lead in the CRM.' },
    { key: 'updateOpportunity', description: 'Update an opportunity record.' },
    { key: 'fetchAccounts', description: 'Fetch account records.', supportsSync: true },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock CRM action ${request.actionType} executed.`,
      responsePayload: { synced: true },
      externalRef: `crm-${Date.now()}`,
    };
  }

  async runSync(_context: ConnectorInstanceContext, request: ConnectorSyncRequest): Promise<ConnectorSyncResult> {
    return {
      success: true,
      status: ConnectorSyncJobStatus.SUCCEEDED,
      summary: `CRM sync job ${request.jobType} imported accounts successfully.`,
      importedCount: 12,
      checkpoint: { lastAccountCursor: 'acct-demo-12' },
    };
  }
}
