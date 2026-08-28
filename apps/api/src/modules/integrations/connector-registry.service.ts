import { Injectable, NotFoundException } from '@nestjs/common';

import { CalendarConnector } from './connectors/calendar.connector';
import { CrmConnector } from './connectors/crm.connector';
import { EmailConnector } from './connectors/email.connector';
import { HelpdeskConnector } from './connectors/helpdesk.connector';
import { IotConnector } from './connectors/iot.connector';
import { SlackConnector } from './connectors/slack.connector';
import { WebhookConnector } from './connectors/webhook.connector';
import { Connector } from './integrations.types';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors = new Map<string, Connector>();

  constructor(
    emailConnector: EmailConnector,
    calendarConnector: CalendarConnector,
    slackConnector: SlackConnector,
    crmConnector: CrmConnector,
    helpdeskConnector: HelpdeskConnector,
    iotConnector: IotConnector,
    webhookConnector: WebhookConnector,
  ) {
    [emailConnector, calendarConnector, slackConnector, crmConnector, helpdeskConnector, iotConnector, webhookConnector].forEach((connector) => {
      this.connectors.set(connector.key, connector);
    });
  }

  getConnector(key: string): Connector {
    const connector = this.connectors.get(key);
    if (!connector) {
      throw new NotFoundException(`Connector ${key} is not registered.`);
    }

    return connector;
  }

  listConnectors(): Connector[] {
    return [...this.connectors.values()];
  }
}
