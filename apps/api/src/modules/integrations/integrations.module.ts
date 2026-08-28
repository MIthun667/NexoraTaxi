import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ConnectorsService } from './connectors.service';
import { ConnectorActionsService } from './connector-actions.service';
import { ConnectorAuthService } from './connector-auth.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorSyncService } from './connector-sync.service';
import { ConnectorWebhooksService } from './connector-webhooks.service';
import { ConnectorsRepository } from './connectors.repository';
import { EmailConnector } from './connectors/email.connector';
import { CalendarConnector } from './connectors/calendar.connector';
import { SlackConnector } from './connectors/slack.connector';
import { CrmConnector } from './connectors/crm.connector';
import { HelpdeskConnector } from './connectors/helpdesk.connector';
import { IotConnector } from './connectors/iot.connector';
import { WebhookConnector } from './connectors/webhook.connector';
import { ConnectorPolicyService } from './policies/connector-policy.service';
import { ShopifyModule } from './shopify/shopify.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [PrismaModule, NotificationsModule, TenancyModule, ObservabilityModule, ShopifyModule, StripeModule],
  providers: [
    ConnectorsRepository,
    ConnectorAuthService,
    ConnectorPolicyService,
    ConnectorsService,
    ConnectorRegistryService,
    ConnectorActionsService,
    ConnectorSyncService,
    ConnectorWebhooksService,
    EmailConnector,
    CalendarConnector,
    SlackConnector,
    CrmConnector,
    HelpdeskConnector,
    IotConnector,
    WebhookConnector,
  ],
  exports: [
    ConnectorsService,
    ConnectorActionsService,
    ConnectorSyncService,
    ConnectorWebhooksService,
    ConnectorRegistryService,
  ],
})
export class IntegrationsModule {}
