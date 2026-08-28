import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { AgentTriggerType } from '@prisma/client';

export class CreateAgentRunDto {
  @ValidateIf((dto: CreateAgentRunDto) => !dto.triggerSource)
  @IsString()
  agentCode?: string;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(AgentTriggerType)
  triggerType?: AgentTriggerType;

  @IsOptional()
  @IsString()
  triggerSource?: string;

  @IsOptional()
  @Type(() => Object)
  @IsObject()
  inputContext?: Record<string, unknown>;
}
