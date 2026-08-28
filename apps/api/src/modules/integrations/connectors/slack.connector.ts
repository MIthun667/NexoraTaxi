import { ConnectorAuthType, ConnectorCategory, ConnectorActionLogStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { Connector, ConnectorActionRequest, ConnectorActionResult, ConnectorInstanceContext } from '../integrations.types';

@Injectable()
export class SlackConnector implements Connector {
  readonly key = 'slack';
  readonly name = 'Slack Connector';
  readonly category = ConnectorCategory.COMMUNICATION;
  readonly authType = ConnectorAuthType.BASIC_TOKEN;
  readonly capabilities = [
    { key: 'postMessage', description: 'Post a standard Slack message.' },
    { key: 'postAlert', description: 'Post an alert to a Slack channel.' },
  ];

  async executeAction(_context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    return {
      success: true,
      status: ConnectorActionLogStatus.SUCCEEDED,
      summary: `Mock Slack action ${request.actionType} posted successfully.`,
      responsePayload: { posted: true, channel: request.targetRef ?? '#ops-demo' },
      externalRef: `slack-${Date.now()}`,
    };
  }
}
