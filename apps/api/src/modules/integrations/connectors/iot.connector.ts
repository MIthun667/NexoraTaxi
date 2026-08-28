import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus, ConnectorSyncJobStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext, ConnectorSyncRequest, ConnectorSyncResult } from '../integrations.types';

@Injectable()
export class IotConnector implements Connector {
  readonly key = 'iot';
  readonly name = 'IoT Connector';
  readonly category = ConnectorCategory.OPERATIONAL;
  readonly authType = ConnectorAuthType.SERVICE_ACCOUNT;
  readonly capabilities = [
    { key: 'ingestTelemetry', description: 'Ingest telemetry records.', supportsSync: true, supportsWebhook: true },
    { key: 'fetchLatestState', description: 'Fetch latest device state.', supportsSync: true },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock IoT action ${request.actionType} executed.`,
      responsePayload: { accepted: true },
      externalRef: `iot-${Date.now()}`,
    };
  }

  async runSync(_context: ConnectorInstanceContext, request: ConnectorSyncRequest): Promise<ConnectorSyncResult> {
    return {
      success: true,
      status: ConnectorSyncJobStatus.SUCCEEDED,
      summary: `IoT sync job ${request.jobType} processed telemetry.`,
      importedCount: 25,
      checkpoint: { lastTelemetryAt: new Date().toISOString() },
    };
  }
}
