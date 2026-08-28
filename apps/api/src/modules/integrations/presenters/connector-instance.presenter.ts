export interface ConnectorInstancePresenter {
  id: string;
  organizationId: string | null;
  connectorDefinitionId: string;
  displayName: string;
  status: string;
  configuration: unknown;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
