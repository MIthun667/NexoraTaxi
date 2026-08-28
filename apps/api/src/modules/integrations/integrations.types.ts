import {
  ConnectorActionLogStatus,
  ConnectorAuthType,
  ConnectorCategory,
  ConnectorSyncJobStatus,
  Prisma,
} from '@prisma/client';

export interface ConnectorCapabilityDescriptor {
  key: string;
  description: string;
  supportsSync?: boolean;
  supportsWebhook?: boolean;
}

export interface ConnectorActionRequest {
  organizationId: string;
  connectorInstanceId: string;
  actionType: string;
  targetRef?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface ConnectorActionResult {
  success: boolean;
  status: ConnectorActionLogStatus;
  summary: string;
  responsePayload?: Prisma.InputJsonValue;
  externalRef?: string | null;
}

export interface ConnectorSyncRequest {
  organizationId: string;
  connectorInstanceId: string;
  jobType: string;
  checkpoint?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface ConnectorSyncResult {
  success: boolean;
  status: ConnectorSyncJobStatus;
  summary: string;
  checkpoint?: Prisma.InputJsonValue;
  importedCount?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface WebhookEventEnvelope {
  organizationId: string | null;
  connectorInstanceId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  receivedAt: Date;
  idempotencyKey?: string | null;
}

export interface ConnectorResolvedCredential {
  type: ConnectorAuthType;
  secret: string;
  expiresAt?: Date | null;
}

export interface ConnectorInstanceContext {
  id: string;
  organizationId: string | null;
  displayName: string;
  status: string;
  definition: {
    id: string;
    key: string;
    name: string;
    category: ConnectorCategory;
    authType: ConnectorAuthType;
    capabilities: Prisma.JsonValue | null;
  };
  configuration: Record<string, unknown> | null;
  credentials: ConnectorResolvedCredential[];
}

export interface Connector {
  readonly key: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly authType: ConnectorAuthType;
  readonly capabilities: ConnectorCapabilityDescriptor[];
  executeAction(context: ConnectorInstanceContext, request: ConnectorActionRequest): Promise<ConnectorActionResult>;
  runSync?(context: ConnectorInstanceContext, request: ConnectorSyncRequest): Promise<ConnectorSyncResult>;
  handleWebhook?(context: ConnectorInstanceContext, envelope: WebhookEventEnvelope): Promise<{ normalizedEventType: string; payload: Record<string, unknown> }>;
}
