import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ExecuteConnectorActionDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  connectorInstanceId!: string;

  @IsString()
  @MaxLength(120)
  actionType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetRef?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
