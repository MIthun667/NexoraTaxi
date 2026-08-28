import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { AgentTriggerType } from '@prisma/client';

export class RunCommerceAgentDto {
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
  @Type(() => Object)
  @IsObject()
  inputContext?: Record<string, unknown>;
}
