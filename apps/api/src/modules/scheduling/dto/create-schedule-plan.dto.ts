import { SchedulePlanStatus, SchedulePlanType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSchedulePlanDto {
  @IsUUID()
  organizationId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsEnum(SchedulePlanType)
  planType!: SchedulePlanType;

  @IsOptional()
  @IsEnum(SchedulePlanStatus)
  status?: SchedulePlanStatus;

  @IsDateString()
  planningWindowStart!: string;

  @IsDateString()
  planningWindowEnd!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
