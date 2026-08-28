import { TriggerActionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdateTriggerRuleDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  aggregateType?: string;

  @IsOptional()
  @IsEnum(TriggerActionType)
  actionType?: TriggerActionType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  actionTarget?: string;

  @IsOptional()
  conditionConfig?: Record<string, unknown>;

  @IsOptional()
  actionConfig?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  cooldownSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dedupeKeyStrategy?: string;
}
