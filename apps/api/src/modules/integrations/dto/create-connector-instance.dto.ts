import { ConnectorAuthType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateConnectorInstanceDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  connectorDefinitionId!: string;

  @IsString()
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ConnectorAuthType)
  credentialType?: ConnectorAuthType;

  @IsOptional()
  @IsString()
  secret?: string;
}
